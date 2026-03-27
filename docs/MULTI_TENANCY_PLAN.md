# Multi-Tenancy Implementation Plan

## Overview

Transform AthleteDesk from a single-tenant CRM to a multi-tenant SaaS platform where multiple sports agencies can use the system with complete data isolation.

---

## Infrastructure Decision: Supabase is the Right Choice

**Verdict: Stick with Supabase** - it's production-ready for multi-tenant SaaS.

### Why Supabase Works for Multi-Tenancy

| Feature | Supabase Support |
|---------|------------------|
| Row Level Security (RLS) | Excellent - built for this |
| Data isolation | RLS policies enforce it at DB level |
| Auth per org | Works great with Google Workspace |
| Storage per org | Supported with policies |
| Real-time | Works with RLS |
| Scale | Handles thousands of orgs easily |

### Supabase Capacity

- **10-500 agencies** - No problem
- **50,000+ athletes total** - Still fine
- **Standard SaaS features** - Perfect fit
- **Cost** - Pro plan is $25/mo, handles a lot

### When You Might Outgrow Supabase (Unlikely Soon)

| Scenario | Consider |
|----------|----------|
| Need separate DB per agency (enterprise compliance) | PlanetScale, Neon, or self-hosted Postgres |
| 10,000+ concurrent users | May need custom infrastructure |
| Heavy analytics/reporting | Add a data warehouse (BigQuery, Snowflake) |
| Complex background jobs | Add a job queue (Inngest, Trigger.dev) |

**Bottom line:** No need to migrate. Supabase handles multi-tenancy well with RLS. Only reconsider if you hit a specific limitation, which likely won't happen for years.

---

## Phase 1: Database Schema Changes

### 1.1 Create Organizations Table

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-safe identifier (e.g., "elite-sports")
  logo_url TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,

  -- Subscription & Billing
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,

  -- Limits (based on tier)
  max_athletes INTEGER DEFAULT 50,
  max_users INTEGER DEFAULT 3,

  -- Settings
  settings JSONB DEFAULT '{}',  -- Custom org settings

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);
```

### 1.2 Update Users Table

```sql
-- Add organization reference to users
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN org_role TEXT DEFAULT 'member' CHECK (org_role IN ('owner', 'admin', 'member'));

-- Index for org lookups
CREATE INDEX idx_users_organization ON users(organization_id);
```

### 1.3 Add organization_id to All Data Tables

```sql
-- Athletes
ALTER TABLE athletes ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_athletes_organization ON athletes(organization_id);

-- Communications Log
ALTER TABLE communications_log ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_communications_organization ON communications_log(organization_id);

-- Brand Outreach
ALTER TABLE brand_outreach ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_brand_outreach_organization ON brand_outreach(organization_id);

-- Financial Tracking
ALTER TABLE financial_tracking ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_financial_tracking_organization ON financial_tracking(organization_id);

-- Recruiting Pipeline
ALTER TABLE recruiting_pipeline ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_recruiting_pipeline_organization ON recruiting_pipeline(organization_id);

-- Tasks
ALTER TABLE tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_tasks_organization ON tasks(organization_id);

-- Documents
ALTER TABLE documents ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_documents_organization ON documents(organization_id);

-- Contracts
ALTER TABLE contracts ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_contracts_organization ON contracts(organization_id);
```

### 1.4 Update Views

```sql
-- Update athletes_with_pipeline view to include organization_id
DROP VIEW IF EXISTS athletes_with_pipeline;
CREATE VIEW athletes_with_pipeline AS
SELECT
  a.*,
  rp.pipeline_stage,
  rp.priority,
  rp.last_contact_date,
  rp.next_action,
  scout.name as scout_name,
  agent.name as agent_name
FROM athletes a
LEFT JOIN recruiting_pipeline rp ON a.id = rp.athlete_id
LEFT JOIN users scout ON a.assigned_scout_id = scout.id
LEFT JOIN users agent ON a.assigned_agent_id = agent.id;
```

---

## Phase 2: Row Level Security (RLS)

### 2.1 Helper Function

```sql
-- Function to get current user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM users
  WHERE google_sso_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;
```

### 2.2 RLS Policies for Each Table

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiting_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own org
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (id = get_user_organization_id());

CREATE POLICY "Owners can update own organization" ON organizations
  FOR UPDATE USING (
    id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE google_sso_id = auth.uid()
      AND org_role = 'owner'
    )
  );

-- Athletes: Users can only see their org's athletes
CREATE POLICY "Users can view org athletes" ON athletes
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org athletes" ON athletes
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update org athletes" ON athletes
  FOR UPDATE USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org athletes" ON athletes
  FOR DELETE USING (organization_id = get_user_organization_id());

-- Repeat similar policies for all other tables:
-- communications_log, brand_outreach, financial_tracking,
-- recruiting_pipeline, tasks, documents, contracts
```

---

## Phase 3: Application Code Changes

### 3.1 Auth & User Context

Create a hook to get current user with organization:

```typescript
// src/hooks/use-current-user.ts
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface UserWithOrg {
  id: string
  name: string
  email: string
  role: string
  organization_id: string
  org_role: 'owner' | 'admin' | 'member'
  organization: {
    id: string
    name: string
    slug: string
    subscription_tier: string
  }
}

export function useCurrentUser() {
  const [user, setUser] = useState<UserWithOrg | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('users')
        .select(`
          *,
          organization:organizations(id, name, slug, subscription_tier)
        `)
        .eq('google_sso_id', authUser.id)
        .single()

      setUser(data)
      setLoading(false)
    }

    fetchUser()
  }, [])

  return { user, loading }
}
```

### 3.2 Update All Data Mutations

Every insert must include organization_id:

```typescript
// Before
const { error } = await supabase
  .from('athletes')
  .insert({ name, email, sport, ... })

// After
const { error } = await supabase
  .from('athletes')
  .insert({
    name,
    email,
    sport,
    organization_id: currentUser.organization_id,  // ADD THIS
    ...
  })
```

### 3.3 Files to Update

These files need `organization_id` added to inserts:

- [ ] `src/app/(dashboard)/athletes/new/page.tsx`
- [ ] `src/app/(dashboard)/athletes/[id]/edit/page.tsx`
- [ ] `src/app/(dashboard)/communications/new/page.tsx`
- [ ] `src/app/(dashboard)/brands/new/page.tsx`
- [ ] `src/app/(dashboard)/financials/new/page.tsx`
- [ ] `src/app/(dashboard)/tasks/new/page.tsx`
- [ ] `src/app/(dashboard)/contracts/page.tsx` (file upload)
- [ ] `src/components/athletes/athlete-panel.tsx`
- [ ] `src/components/tasks/task-panel.tsx`
- [ ] `src/components/import/athlete-import-modal.tsx`
- [ ] `src/app/(dashboard)/pipeline/pipeline-client.tsx`

---

## Phase 4: Onboarding Flow

### 4.1 New Signup Flow

```
1. User clicks "Sign Up"
2. Google OAuth login
3. Check if user exists in users table
   - If YES: redirect to dashboard
   - If NO: show organization setup
4. Organization setup form:
   - Organization name
   - Slug (auto-generated, editable)
   - User becomes owner
5. Create organization + user records
6. Redirect to dashboard
```

### 4.2 Invite Team Members

```typescript
// Create invites table
CREATE TABLE organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// Invite flow:
// 1. Admin enters email + role
// 2. System creates invite with unique token
// 3. Email sent with invite link: /invite?token=xxx
// 4. New user clicks link, signs in with Google
// 5. System links them to the organization
```

### 4.3 New Pages Needed

- [ ] `/onboarding` - Organization setup for new users
- [ ] `/invite` - Accept invite page
- [ ] `/settings/team` - Update to show invites, manage members
- [ ] `/settings/organization` - Org profile, logo, settings

---

## Phase 5: Subscription & Billing (Stripe)

### 5.1 Subscription Tiers

| Feature | Free | Pro ($49/mo) | Enterprise ($199/mo) |
|---------|------|--------------|---------------------|
| Athletes | 50 | 500 | Unlimited |
| Users | 3 | 15 | Unlimited |
| Storage | 1GB | 10GB | 100GB |
| Email templates | 5 | Unlimited | Unlimited |
| API access | No | Yes | Yes |
| Priority support | No | Yes | Yes |
| Custom branding | No | No | Yes |

### 5.2 Stripe Integration

```typescript
// Environment variables needed:
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx

// API routes to create:
// /api/stripe/create-checkout - Start subscription
// /api/stripe/webhook - Handle Stripe events
// /api/stripe/portal - Customer billing portal
```

### 5.3 Limit Enforcement

```typescript
// Middleware to check limits
async function checkAthleteLimit(organizationId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('max_athletes, subscription_tier')
    .eq('id', organizationId)
    .single()

  const { count } = await supabase
    .from('athletes')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (count >= org.max_athletes) {
    throw new Error('Athlete limit reached. Please upgrade your plan.')
  }
}
```

---

## Phase 6: Data Migration

### 6.1 For Existing Data

If you already have data in the system before multi-tenancy:

```sql
-- 1. Create the first organization
INSERT INTO organizations (id, name, slug)
VALUES ('your-uuid-here', 'Your Agency Name', 'your-agency');

-- 2. Assign all existing users to this org
UPDATE users SET organization_id = 'your-uuid-here', org_role = 'admin';

-- 3. Assign all existing data to this org
UPDATE athletes SET organization_id = 'your-uuid-here';
UPDATE communications_log SET organization_id = 'your-uuid-here';
UPDATE brand_outreach SET organization_id = 'your-uuid-here';
UPDATE financial_tracking SET organization_id = 'your-uuid-here';
UPDATE recruiting_pipeline SET organization_id = 'your-uuid-here';
UPDATE tasks SET organization_id = 'your-uuid-here';
UPDATE documents SET organization_id = 'your-uuid-here';
UPDATE contracts SET organization_id = 'your-uuid-here';

-- 4. Make organization_id NOT NULL after migration
ALTER TABLE athletes ALTER COLUMN organization_id SET NOT NULL;
-- Repeat for all tables...
```

---

## Implementation Checklist

### Database
- [ ] Create organizations table
- [ ] Add organization_id to users table
- [ ] Add organization_id to all data tables
- [ ] Create indexes
- [ ] Set up RLS policies
- [ ] Update views
- [ ] Create organization_invites table

### Backend
- [ ] Create useCurrentUser hook with org data
- [ ] Update all insert operations to include organization_id
- [ ] Add limit checking middleware
- [ ] Create invite API routes
- [ ] Set up Stripe integration

### Frontend
- [ ] Create onboarding flow for new users
- [ ] Create invite acceptance page
- [ ] Update settings/team page for invites
- [ ] Create settings/organization page
- [ ] Add upgrade prompts when limits reached
- [ ] Show org name in sidebar/header

### Testing
- [ ] Test complete signup flow
- [ ] Test invite flow
- [ ] Verify data isolation between orgs
- [ ] Test subscription upgrade/downgrade
- [ ] Test limit enforcement

---

## Security Considerations

1. **RLS is critical** - Never bypass RLS in application code
2. **Validate organization_id** - Don't trust client-provided org IDs
3. **Audit logging** - Consider logging sensitive operations per org
4. **Data export** - Allow orgs to export their data (GDPR compliance)
5. **Data deletion** - Implement org deletion with cascade

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Database Schema | 1 day |
| Phase 2: RLS Policies | 1 day |
| Phase 3: Code Updates | 2-3 days |
| Phase 4: Onboarding Flow | 2 days |
| Phase 5: Stripe Billing | 2-3 days |
| Phase 6: Migration | 0.5 day |
| Testing & QA | 2 days |
| **Total** | **~10-12 days** |

---

## Questions to Decide Before Starting

1. **Pricing structure** - What are the actual tier prices and limits?
2. **Free tier** - Offer a free tier or just a trial?
3. **Trial period** - How long? 14 days? 30 days?
4. **Subdomain routing** - Do agencies want `theiragency.athletedesk.com`?
5. **White labeling** - Can enterprise customers hide "AthleteDesk" branding?
6. **Data retention** - How long to keep data after subscription ends?

---

*Last updated: March 2026*
