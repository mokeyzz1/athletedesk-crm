# AthleteDesk CRM - Project Context

## What This Is
A sports agency CRM built for managing athletes, recruiting pipelines, brand deals, communications, and financial tracking. Built for sports agencies to onboard clients, track outreach, and manage revenue.

**Live URL:** TBD
**Repo:** https://github.com/mokeyzz1/athletedesk-crm

---

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Google OAuth via Supabase
- **Email:** Gmail API integration
- **Styling:** Tailwind CSS
- **State:** Zustand + React Context
- **Export/Import:** xlsx library

---

## Database Structure (17+ tables)

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant orgs - each agency is an organization |
| `organization_invites` | Invite tokens for new user signup |
| `users` | Staff accounts with roles, org_id, is_super_admin, Gmail tokens |
| `athletes` | Core athlete records with scout_ids[], agent_ids[], marketing_ids[] arrays |
| `communications_log` | All logged communications (email, call, text, zoom) with follow-up tracking |
| `recruiting_pipeline` | Pipeline stage tracking per athlete |
| `brand_outreach` | Brand partnership tracking with response status and deal values |
| `financial_tracking` | Deal revenue, agency fees, payment status |
| `documents` | File uploads for athletes |
| `tasks` | Work items with assignments, due dates, priorities |
| `task_comments` | Comments on tasks with @mention support |
| `comment_mentions` | Tracks @mentions for notifications |
| `email_templates` | Pre-made email templates (shared or personal) |
| `roster_teams` | Groups of athletes |
| `recruiting_regions` | Geographic territories (Northwest, Southeast, etc.) |
| `region_assignments` | Default agent/marketing per region for auto-handoffs |
| `user_integrations` | OAuth tokens for Gmail, Calendar, DocuSign, Calendly, Apollo |

---

## Key Enums

**Outreach Status (recruiting progression):**
`not_contacted` → `contacted` → `in_conversation` → `interested` → `signed`
(or `dead_lead` / `circling_back`)

**Pipeline Stages:**
`prospect_identified` → `scout_evaluation` → `initial_contact` → `recruiting_conversation` → `interested` → `signing_in_progress` → `signed_client`

**Deal Types:**
- `revenue_share` - Scholarship/revenue share deals
- `marketing_brand` - Sponsorship/brand deals

**User Roles:** admin, agent, scout, marketing, intern

---

## Main Pages

| Route | What It Does |
|-------|--------------|
| `/dashboard` | Metrics, follow-ups, tasks, activity feed, goals |
| `/athletes` | All athletes list with search/filter |
| `/athletes/[id]` | Full athlete profile |
| `/recruiting` | Kanban board for outreach status |
| `/roster` | Signed athletes with deal tracking |
| `/communications` | Communication log |
| `/email` | Gmail inbox/compose |
| `/brands` | Brand outreach tracking |
| `/financials` | Deal revenue & payments |
| `/tasks` | Kanban task board |
| `/contracts` | Document management |
| `/settings` | Gmail, templates, regions, teams |
| `/team/productivity` | Admin: staff metrics |

---

## Key Decisions Made

### Import System
- **Sheet names = Region names** - Don't map sheet names to different regions. "Northwest" sheet → region = "Northwest"
- **Sport selection** - User picks sport in preview step, not auto-detected
- **State headers filtered** - Rows like "IDAHO", "MONTANA" are detected and skipped
- **Auto-create regions** - If a region doesn't exist in `recruiting_regions`, create it automatically
- **Template approach preferred** - For clean imports, provide users a template to fill in

### Data Model
- **Athletes table serves dual purpose** - Both recruiting prospects AND signed roster clients
- **outreach_status vs pipeline_stage** - outreach_status is simpler (for recruiting view), pipeline_stage is more detailed
- **When signed** - Moving to `signed_client` pipeline stage auto-sets `recruiting_status = 'signed'`

### Gmail Integration
- Separate OAuth from Supabase auth
- Tokens stored in users table
- Auto-refresh when expired
- Sent emails auto-log to communications_log

### UI/UX
- Slack-like clean design - minimal colors, mostly gray/white with brand accent
- No gradients, simple borders
- Import modal: drag-drop, sheet preview with sample names and columns

---

## Conventions

### Git
- **No co-author** on commits unless asked
- **Don't push** unless explicitly asked
- **Don't commit** unless explicitly asked
- Commit messages: short and descriptive

### Code
- TypeScript strict
- Tailwind for all styling
- Server components by default, 'use client' only when needed
- Supabase client: `createClient()` from appropriate file (client vs server)

### Files
- Page logic in page.tsx (server component)
- Interactive parts in *-client.tsx (client component)
- Types in `src/lib/database.types.ts`
- Queries in `src/lib/queries/`

---

## Current State (April 2026)

### Complete & Working
- ✅ Authentication (Google OAuth)
- ✅ Dashboard with all widgets
- ✅ Athletes CRUD (create, read, update, delete)
- ✅ Recruiting Kanban board
- ✅ Roster management
- ✅ Communications logging
- ✅ Gmail integration (connect, send, inbox)
- ✅ Brand outreach tracking
- ✅ Financial tracking
- ✅ Tasks with Kanban and comments
- ✅ Document uploads
- ✅ Excel/CSV import with column mapping
- ✅ Excel/CSV export
- ✅ Email templates
- ✅ Outreach goals
- ✅ Team productivity (admin)
- ✅ Settings (notifications, regions, teams)
- ✅ Mobile responsive
- ✅ Automated handoffs (Scout→Agent when "Interested", Agent→Marketing when "Signed")
- ✅ **Multi-tenancy** - Complete org isolation with RLS (50+ policies)
- ✅ **Invite-only signup** - Users must have valid invite token
- ✅ **Super admin panel** - Manage all organizations at /admin
- ✅ **Server actions** - Secure mutations with guaranteed org_id
- ✅ **Automated testing** - 97 tests with Vitest
- ✅ **Multi-staff assignments** - scout_ids[], agent_ids[], marketing_ids[]
- ✅ **Integrations** - Gmail, Google Calendar, DocuSign, Calendly, Apollo

### Known Issues
- None critical currently

### Not Yet Built
- Push notifications
- Advanced analytics/charts
- Bulk email campaigns
- SMS integration
- Stripe billing

---

## Important Files

| File | What It Does |
|------|--------------|
| `src/lib/database.types.ts` | All TypeScript types and enums |
| `src/lib/actions/auth.ts` | Server action auth context (getAuthContext) |
| `src/lib/actions/athletes.ts` | Server actions for athlete CRUD |
| `src/lib/export.ts` | Import/export logic with column mapping |
| `src/lib/queries/email-stats.ts` | Email count queries |
| `src/lib/queries/goal-progress.ts` | Goal tracking queries |
| `src/middleware.ts` | Auth protection for routes |
| `src/components/import/athlete-import-modal.tsx` | Excel import UI |
| `src/stores/pipeline-store.ts` | Zustand store for pipeline |
| `src/contexts/athlete-panel-context.tsx` | Athlete panel state |
| `src/app/api/athletes/[id]/status/route.ts` | Status changes with auto-handoff logic |
| `src/app/api/settings/region-assignments/route.ts` | Manage default agents per region |
| `src/app/invite/page.tsx` | Invite acceptance page |
| `src/app/admin/page.tsx` | Super admin dashboard |
| `vitest.config.ts` | Test configuration |
| `docs/` | User guide, deployment notes, multi-tenancy plan |

---

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY    # Required for migrations
DATABASE_URL                  # Direct postgres connection
NEXT_PUBLIC_APP_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

---

## Common Tasks

### Run dev server
```bash
npm run dev
```

### Run tests
```bash
npm test              # Run all 97 tests
npm test -- --watch   # Watch mode
```

### Check for errors
```bash
npm run lint
npx tsc --noEmit
```

### Generate DB types
```bash
npm run db:types
```

### Run database migrations
```bash
# Supabase CLI is installed - use it for migrations
supabase db query --linked -f supabase/migrations/FILENAME.sql
```

### Direct database access
- Supabase CLI must be linked first: `supabase link --project-ref lonbjhjjmsvmngldcyuy`
- Anon key = read/write data only
- Service role key = schema changes (CREATE TABLE, ALTER TABLE)
- Don't use psql directly - DNS issues with Supabase hostnames

---

## Notes for Future Sessions

- User prefers clean, Slack-like UI
- User is building this for sports agency clients (self-service)
- Import feature is important - clients have existing data to migrate
- Always ask before committing or pushing
- Check git status before making changes
- User communicates casually, keep responses concise

---

*Last updated: April 2026*
