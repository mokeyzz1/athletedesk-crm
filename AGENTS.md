# AthleteDesk CRM - Project Context

## What This Is
A sports agency CRM built for managing athletes, recruiting pipelines, brand deals, communications, and financial tracking. Built for sports agencies to onboard clients, track outreach, and manage revenue.

**Live URL:** https://athletedesk.io
**Repo:** https://github.com/mokeyzz1/athletedesk-crm

> **Domains:** `athletedesk.io` is the **live production site** (Vercel project `athletedesk-crm`).
> The **demo account** used by the "Try the demo" button on the landing page is `demo@athletedesk.app`
> — a real seeded Supabase Auth user (see `scripts/setup-demo-auth.js`). The `.app` is intentional and
> left as-is; visitors never see it (auto-login). Don't change the demo email string alone or the demo breaks.

---

## Current Client: One Time Management

**One Time Management** is a full-service NIL (Name, Image, Likeness) sports agency actively using the CRM.

**Agency Profile:**
- Type: Full-service NIL agency
- Sports focus: Football, Track & Field, Basketball, Wrestling
- Regions: Great Lakes, Midwest, New England, Northwest, South, Southeast, Southwest

**Live Usage (as of April 2026):**
| Data | Count |
|------|-------|
| Athletes | 737 (30 signed, 120 prospects) |
| Staff | 10 (1 admin, 5 agents, 2 scouts, 2 marketing) |
| Communications logged | 347 |
| Tasks | 65 |
| Brand outreach | 16 |
| Gmail connected | 7 users |

**What they use most:**
- Athlete imports (bulk Excel uploads by region)
- Recruiting pipeline (prospect → signed)
- Communications logging
- Task management
- Gmail integration for outreach

**What's less used:**
- Documents (0 uploaded)
- Financial tracking (1 record)
- Other integrations (DocuSign, Calendly, Apollo not connected)

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
- **Validation:** Zod
- **Error Monitoring:** Sentry

---

## Security & Validation

**Input Validation:**
- Zod schemas in `src/lib/validations.ts` for reusable validation
- Server actions validate with Zod before database operations
- API routes validate request bodies with Zod schemas

**Database Security:**
- All queries use parameterized Supabase methods (no SQL injection risk)
- RLS policies enforce org isolation (50+ policies)
- `getAuthContext()` guarantees org_id on all mutations

**Error Monitoring:**
- Sentry configured for client, server, and edge
- Errors auto-reported to Sentry dashboard
- Tunnel route `/monitoring` bypasses ad-blockers

**No XSS Risk:**
- No `dangerouslySetInnerHTML` usage
- User HTML (email signatures) only sent in own outgoing emails
- React's default escaping handles text rendering

---

## Database Structure (17+ tables)

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant orgs - each agency is an organization |
| `organization_invites` | Invite tokens for new user signup |
| `users` | Staff accounts with is_admin + work_roles[] + primary_work_role (clean model), org_id, is_super_admin, Gmail tokens |
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

### Clean Role Model
- **Admin is a permission, not a role** - `is_admin` boolean grants full access
- **Work roles are identity** - `work_roles[]` array: scout, agent, marketing, intern
- **Primary work role for display** - `primary_work_role` shown as badge
- Legacy columns (`role`, `roles[]`, `primary_role`) kept for RLS, synced via dual-write
- Permission checks: `isAdminLike(user)` - true if super_admin OR is_admin
- Work role checks: `hasWorkRole(user, 'scout')` - NO admin shortcut, checks actual work roles
- Role helpers in `src/lib/roles.ts`: `isAdminLike()`, `hasWorkRole()`, `hasAnyWorkRole()`, `getWorkRoles()`, `getPrimaryWorkRole()`

### Self-Assignment
- Staff can assign themselves to athletes via `self_assign_athlete` RPC
- RPC accepts optional `p_assignment_role` for multi-role users
- Only works for roles the user actually has (validated server-side)
- Blocked if someone else is already assigned for that role

### Server Actions Pattern
All mutations should go through server actions in `src/lib/actions/`. This ensures:
- Proper auth context via `getAuthContext()`
- Organization scoping
- Notifications
- Activity logging
- Path revalidation

**Never do direct `.update()` calls from client components for:**
- Athlete assignments (use `assignAthleteStaff()`, `unassignAthleteStaff()`)
- Athlete edits (use `updateAthlete()`)
- User role changes (use `updateUserRoles()`)

**Direct client writes are OK for:**
- Simple status toggles where no side effects needed
- UI-only state

### Activity Logging / Audit Trail
All significant actions are logged to the `activity_events` table:
- Athlete assignments (assign/unassign/reassign/self-claim)
- Status changes and handoffs
- Communications (log/edit/delete, follow-ups)
- Documents (upload/delete/status)
- Contracts (sent, status changed)
- Deals (create/update/delete, payment status)
- Tasks (create/update/delete/complete/reassign)
- Pipeline changes (stage, priority)
- Brand outreach (create/edit/delete, response/status)

**Server-side logging:** Use `logActivityEvent()` from `src/lib/activity.ts`
**Client-side logging:** Use `logClientActivityEvent()` from `src/lib/activity-client.ts`

Events appear on the athlete profile timeline and can be queried for audit purposes.

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
- ✅ **Automated testing** - 101 tests with Vitest
- ✅ **Multi-staff assignments** - scout_ids[], agent_ids[], marketing_ids[]
- ✅ **Integrations** - Gmail, Google Calendar, DocuSign, Calendly, Apollo
- ✅ **Multi-role support** - Users can have multiple roles (e.g., scout+marketing)
- ✅ **Self-assignment** - Staff can assign themselves to athletes via RPC
- ✅ **Activity audit trail** - All significant actions logged to activity_events table
- ✅ **Assignment notifications** - Bell notifications for athlete assignments/unassignments
- ✅ **Unified handoffs** - Pipeline and status changes use same handoff logic
- ✅ **Clean role model** - Admin is permission (is_admin), work roles are identity (work_roles[])

### Known Issues
- None critical currently

### Not Yet Built
- Error monitoring (Sentry or similar) - currently errors go to console.error only
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
| `src/lib/roles.ts` | Role helpers: isAdminLike, hasWorkRole, hasAnyWorkRole, getWorkRoles, getPrimaryWorkRole |
| `src/lib/actions/auth.ts` | Server action auth context (getAuthContext, requireRole) |
| `src/lib/actions/users.ts` | Server actions for team management (updateUserRoles, updateUserRegions) |
| `src/lib/actions/athletes.ts` | Server actions for athlete CRUD, assignments, notifications |
| `src/lib/activity.ts` | Server-side activity event logging |
| `src/lib/activity-client.ts` | Client-side activity event logging API |
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

## Model Usage & Efficiency

**Model selection:**
- Use **Haiku** for: file searches, reading code, simple edits, running commands, quick questions
- Use **Opus** for: complex refactors, architecture decisions, multi-step debugging, planning
- When spawning Task agents for searches/exploration, use `model: "haiku"`

**Efficiency rules:**
- Ask before doing broad multi-file changes
- Read specific line ranges, not full files (use offset/limit)
- Don't run lint + typecheck + tests after every small edit - only when asked or when done
- One task per session, then end
- If user says someone else will handle it, stop immediately
- For bulk updates (10+ files), suggest using Codex instead

**Known patterns in this codebase:**
- Date-only fields (YYYY-MM-DD): use `parseDate()` from helpers.ts, never raw `new Date()`
- Local date strings: use `getLocalDateString()`, never `toISOString().split('T')[0]`
- Client components need 'use client' directive
- RLS policies use `get_current_organization_id()` for org isolation
- Server actions in `src/lib/actions/` use `getAuthContext()` for auth
- Permission checks: use `isAdminLike(user)` for admin powers, never `user.role === 'admin'`
- Work role checks: use `hasWorkRole(user, 'scout')` - does NOT give admin a free pass
- Getting work roles: use `getWorkRoles(user)` which returns only work roles (no admin)
- Activity logging: use `logActivityEvent()` server-side, `logClientActivityEvent()` client-side
- Athlete mutations: use server actions, not direct `.update()` calls

---

## Common Tasks

### Run dev server
```bash
npm run dev
```

### Run tests
```bash
npm test              # Run all 101 tests
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

## Debugging & Health Checks

**Quick database checks:**
```bash
# Count athletes
supabase db query --linked "SELECT COUNT(*) FROM athletes"

# Recent activity (last 24h)
supabase db query --linked "SELECT event_type, title, created_at FROM activity_events ORDER BY created_at DESC LIMIT 10"

# Check Gmail tokens (NULL = expired/disconnected)
supabase db query --linked "SELECT name, gmail_email, gmail_token_expires_at FROM users WHERE gmail_access_token IS NOT NULL"

# Pipeline breakdown
supabase db query --linked "SELECT pipeline_stage, COUNT(*) FROM recruiting_pipeline GROUP BY pipeline_stage"
```

**Common issues to watch for:**
- Gmail token expiry (users need to reconnect)
- Import failures (bad Excel formatting, missing required fields)
- Handoff not triggering (pipeline stage change didn't fire status update)

**Error handling:**
- All critical operations now have user-facing error messages
- Errors logged via `console.error()` - check server/Vercel logs
- No external monitoring yet (Sentry recommended)

---

## Client Workflow (One Time Management)

**How they use the CRM:**

1. **Scouts** import prospect lists by region (Excel upload)
2. **Scouts** work prospects through pipeline (contact → interested)
3. When marked "interested" → auto-handoff to **Agents**
4. **Agents** close deals, move to "signed"
5. When signed → auto-handoff to **Marketing**
6. **Marketing** handles brand deals for signed athletes
7. Everyone logs communications (calls, emails, texts)
8. **Admin** monitors team productivity

**Their pain points (things that matter most):**
- Import must work smoothly (they upload hundreds at a time)
- Pipeline/handoffs must be reliable (their workflow depends on it)
- Gmail integration (most communication happens via email)

---

## Notes for Future Sessions

- User (dev) prefers concise responses, casual communication
- User is building this for sports agency clients
- Import feature is critical - clients have existing data to migrate
- Always ask before committing or pushing
- Check git status before making changes
- Don't over-engineer - keep solutions simple
- Verify issues exist before fixing them

---

*Last updated: April 30, 2026*

## Imported Claude Cowork project instructions
