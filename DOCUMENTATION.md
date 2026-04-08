# AthleteDesk CRM - Complete Documentation

A professional-grade Customer Relationship Management system for sports agencies to manage athletes, brand deals, recruiting pipelines, communications, and financial tracking.

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Getting Started](#getting-started)
3. [Database Schema](#database-schema)
4. [Pages & Routes](#pages--routes)
5. [Components](#components)
6. [API Routes](#api-routes)
7. [Business Logic](#business-logic)
8. [Authentication](#authentication)
9. [State Management](#state-management)
10. [User Roles & Permissions](#user-roles--permissions)
11. [Key Workflows](#key-workflows)
12. [Import/Export System](#importexport-system)
13. [Gmail Integration](#gmail-integration)
14. [Environment Variables](#environment-variables)
15. [User Guide](#user-guide)

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | Next.js (App Router) | 14.2.21 |
| **UI Library** | React | 18.3.1 |
| **Language** | TypeScript | 5.7.2 |
| **Styling** | Tailwind CSS | 3.4.17 |
| **Database** | Supabase (PostgreSQL) | - |
| **Authentication** | Supabase Auth + Google OAuth | - |
| **Email Integration** | Gmail API | - |
| **State Management** | Zustand | 5.0.12 |
| **Drag & Drop** | @dnd-kit | 6.3.1 |
| **Spreadsheet** | xlsx | 0.18.5 |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Google Cloud Console project (for OAuth)

### Installation
```bash
# Clone the repository
git clone https://github.com/mokeyzz1/athletedesk-crm.git

# Install dependencies
npm install

# Set up environment variables (see Environment Variables section)
cp .env.example .env.local

# Run development server
npm run dev
```

### Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run db:types # Generate TypeScript types from Supabase
```

---

## Database Schema

### Core Tables

#### `users`
Staff member accounts linked to Google SSO.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Display name |
| email | TEXT | Email address |
| role | ENUM | admin, agent, scout, marketing, intern |
| google_sso_id | TEXT | Google OAuth ID |
| avatar_url | TEXT | Profile picture URL |
| assigned_regions | TEXT[] | Regions this user manages |
| notify_follow_ups | BOOLEAN | Email notification preference |
| notify_task_reminders | BOOLEAN | Task reminder preference |
| notify_new_assignments | BOOLEAN | Assignment notification preference |
| notify_weekly_summary | BOOLEAN | Weekly digest preference |
| gmail_access_token | TEXT | Gmail OAuth access token |
| gmail_refresh_token | TEXT | Gmail OAuth refresh token |
| gmail_token_expiry | TIMESTAMP | Token expiration time |
| gmail_email | TEXT | Connected Gmail address |

#### `athletes`
Central record for all athletes (both recruiting prospects and signed clients).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Full name (required) |
| email | TEXT | Email address |
| phone | TEXT | Phone number |
| school | TEXT | Current school/team |
| sport | TEXT | Primary sport |
| position | TEXT | Playing position |
| league_level | ENUM | high_school, college, professional, international |
| eligibility_year | INTEGER | Graduation/eligibility year |
| recruiting_status | ENUM | not_recruiting, open_to_contact, actively_recruiting, committed, signed |
| transfer_portal_status | ENUM | not_in_portal, entered_portal, committed, transferred |
| marketability_score | INTEGER | 1-100 marketability rating |
| social_media | JSONB | Instagram, Twitter, TikTok, YouTube data |
| sport_specific_stats | JSONB | Height, weight, 40-time, PPG, etc. |
| notes | TEXT | General notes |
| class_year | ENUM | 2025-2030, pro, n_a |
| region | TEXT | Geographic region (Northwest, Southeast, etc.) |
| outreach_status | ENUM | not_contacted, contacted, in_conversation, interested, dead_lead, circling_back, signed |
| last_contacted_date | DATE | Most recent contact |
| assigned_scout_id | UUID | FK to users |
| assigned_agent_id | UUID | FK to users |
| assigned_marketing_lead_id | UUID | FK to users |
| roster_team_id | UUID | FK to roster_teams |

#### `communications_log`
Records all communications with athletes and external contacts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | FK to athletes (nullable for non-athlete emails) |
| staff_member_id | UUID | FK to users (who logged it) |
| communication_date | TIMESTAMP | When communication occurred |
| type | ENUM | email, call, text, zoom |
| subject | TEXT | Subject/topic |
| notes | TEXT | Communication details |
| follow_up_date | DATE | When to follow up |
| follow_up_completed | BOOLEAN | Whether follow-up is done |
| recipient_email | TEXT | For non-athlete communications |
| recipient_name | TEXT | For non-athlete communications |

#### `recruiting_pipeline`
Tracks athlete progression through the recruiting funnel.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | FK to athletes |
| pipeline_stage | ENUM | See Pipeline Stages below |
| priority | ENUM | high, medium, low |
| last_contact_date | DATE | Most recent contact |
| next_action | TEXT | What to do next |
| notes | TEXT | Pipeline-specific notes |

**Pipeline Stages:**
1. `prospect_identified` - Initial discovery
2. `scout_evaluation` - Being evaluated by scout
3. `initial_contact` - First outreach made
4. `recruiting_conversation` - Active discussions
5. `interested` - Athlete shows interest
6. `signing_in_progress` - Working on contract
7. `signed_client` - Fully signed

#### `brand_outreach`
Tracks brand partnership and sponsorship opportunities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| brand_name | TEXT | Company name |
| brand_contact_name | TEXT | Contact person |
| brand_contact_email | TEXT | Contact email |
| staff_member_id | UUID | FK to users (who's working this) |
| athlete_id | UUID | FK to athletes |
| date_contacted | DATE | First contact date |
| outreach_method | ENUM | email, phone, linkedin, event |
| response_status | ENUM | no_response, interested, not_interested, in_discussion, deal_closed |
| follow_up_date | DATE | Next follow-up |
| deal_value | DECIMAL | Potential cash value |
| product_value | DECIMAL | Potential product value |
| campaign_details | TEXT | Campaign description |
| deal_stage | ENUM | prospective, active |
| notes | TEXT | Additional notes |

#### `financial_tracking`
Tracks actual deals and revenue.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | FK to athletes |
| brand_outreach_id | UUID | FK to brand_outreach (optional) |
| deal_name | TEXT | Name of deal |
| deal_value | DECIMAL | Total deal value |
| agency_percentage | DECIMAL | Agency cut (e.g., 15%) |
| agency_fee | DECIMAL | Calculated: deal_value * agency_percentage |
| athlete_payout | DECIMAL | Calculated: deal_value - agency_fee |
| payment_status | ENUM | pending, invoiced, paid |
| deal_date | DATE | When deal was signed |
| invoice_date | DATE | When invoice sent |
| payment_date | DATE | When payment received |
| deal_type | ENUM | revenue_share, marketing_brand |
| deal_stage | ENUM | prospective, active |
| notes | TEXT | Deal notes |

#### `documents`
File attachments for athletes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| athlete_id | UUID | FK to athletes |
| uploaded_by | UUID | FK to users |
| name | TEXT | File name |
| file_type | TEXT | MIME type |
| file_size | INTEGER | Size in bytes |
| storage_path | TEXT | Supabase storage path |
| document_type | TEXT | contract, headshot, highlight, medical, other |
| notes | TEXT | File description |

#### `tasks`
Work items and reminders.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Task title |
| description | TEXT | Task details |
| assigned_to | UUID | FK to users (who should do it) |
| created_by | UUID | FK to users (who created it) |
| athlete_id | UUID | FK to athletes (optional) |
| due_date | DATE | When it's due |
| priority | ENUM | high, medium, low |
| status | ENUM | todo, in_progress, done |

#### `task_comments`
Comments on tasks with @mention support.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| task_id | UUID | FK to tasks |
| author_id | UUID | FK to users |
| content | TEXT | Comment text (supports @mentions) |

#### `comment_mentions`
Tracks @mentions for notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| comment_id | UUID | FK to task_comments |
| mentioned_user_id | UUID | FK to users |
| is_read | BOOLEAN | Whether user has seen it |

#### `email_templates`
Pre-made email templates.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Template name |
| subject | TEXT | Email subject line |
| body | TEXT | Email body (supports placeholders) |
| created_by | UUID | FK to users |
| is_shared | BOOLEAN | Visible to all users |

#### `roster_teams`
Groups of athletes for organization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Team name |
| regions | TEXT[] | Associated regions |

#### `recruiting_regions`
Geographic recruiting territories.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Region name (Northwest, Southeast, etc.) |
| states | TEXT[] | States in this region |

#### `region_assignments`
Default staff assignments per region for automated handoffs.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| region | TEXT | Region name (unique) |
| default_agent_id | UUID | Default agent for this region (FK → users) |
| default_marketing_id | UUID | Default marketing lead for this region (FK → users) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Database Views

| View | Purpose |
|------|---------|
| `dashboard_summary` | Aggregated metrics for dashboard |
| `athletes_with_pipeline` | Athletes joined with pipeline data |
| `recruiting_summary` | Stats by region and class year |
| `pending_follow_ups` | Due/overdue follow-ups |

---

## Pages & Routes

### Dashboard Group (`/dashboard`)

#### Main Dashboard
**Route:** `/dashboard`

Displays:
- Key metrics (total athletes, signed clients, portal entries, active brand talks)
- Revenue stats (total, pending, this month)
- Recruiting progress by region with visual progress bars
- Personal outreach goal progress
- Team goal summary (admin only)
- My Tasks widget
- Pending Follow-ups widget
- Active Brand Discussions widget
- Recent Athletes widget
- Activity Feed (recent comms, deals, brands, docs)

### Athletes Group (`/athletes`)

#### Athletes List
**Route:** `/athletes`

Features:
- Table view of all athletes
- Search by name, sport, school
- Filter by recruiting status, region, class year
- Sort by any column
- Quick actions: view, edit, delete
- Import button (Excel/CSV)
- Export button (Excel/CSV)
- Click row to open athlete panel

#### Athlete Detail
**Route:** `/athletes/[id]`

Sections:
- Profile header with photo, name, school, sport
- Contact info (email, phone)
- Social media links with follower counts
- Sport-specific stats
- Pipeline status card (stage, priority, next action)
- Communication history
- Brand deals (active and prospective)
- Financial tracking
- Documents
- Activity timeline
- Quick actions: edit, send email, delete

#### Add Athlete
**Route:** `/athletes/new`

Form fields:
- Basic: name, email, phone, school
- Sport: sport, position, league level, eligibility year
- Recruiting: class year, region, outreach status
- Social media: Instagram, Twitter, TikTok, YouTube
- Sport-specific stats (dynamic based on sport)
- Assignments: scout, agent, marketing lead
- Notes

#### Edit Athlete
**Route:** `/athletes/[id]/edit`

Same as Add Athlete but pre-populated.

### Recruiting (`/recruiting`)

**Route:** `/recruiting`

Features:
- Kanban board view by outreach status
- Filter by region, class year
- Email count per athlete
- Drag-and-drop status changes
- Bulk actions
- Region progress stats
- Quick sign modal (move to signed + create deal)

### Roster (`/roster`)

**Route:** `/roster`

Features:
- View signed athletes only
- Filter by roster team
- Deal summary per athlete
- Revenue share vs marketing brand breakdown
- Email counts
- Prospective deal tracking

### Communications (`/communications`)

**Route:** `/communications`

Features:
- Log new communication (email, call, text, zoom)
- View communication history
- Filter by type, date range, staff member
- Email stats overview (all-time, this week, this month)
- Staff leaderboard
- Pending follow-ups
- Mark follow-ups complete

### Email (`/email`)

**Route:** `/email`

Features:
- Gmail inbox view
- Compose new email
- Use email templates
- Reply to emails
- Email logs to communications automatically
- Requires Gmail OAuth connection

### Brand Outreach (`/brands`)

**Route:** `/brands`

Features:
- Track brand partnerships
- Kanban by response status
- Deal value tracking
- Follow-up reminders
- Link to athletes
- Active vs prospective deals

### Financials (`/financials`)

**Route:** `/financials`

Features:
- All deals with payment status
- Filter by deal type, payment status, athlete
- Revenue calculations
- Agency fee tracking
- Invoice/payment date tracking
- Monthly/quarterly summaries

### Tasks (`/tasks`)

**Route:** `/tasks`

Features:
- Kanban board (todo, in_progress, done)
- Filter: my tasks, overdue, marketing tasks
- Priority indicators
- Due date warnings
- Link to athletes
- Comments with @mentions
- Quick status updates

### Contracts (`/contracts`)

**Route:** `/contracts`

Features:
- Document management
- Upload files to athlete records
- Filter by document type
- Download files
- View metadata

### Settings (`/settings`)

**Route:** `/settings`

Sections:
- **Notifications:** Toggle email preferences
- **Gmail:** Connect/disconnect Gmail account
- **Email Templates:** Create, edit, delete templates
- **Roster Teams:** Manage team groupings
- **Recruiting Regions:** Manage geographic territories

### Outreach Goals (`/settings/outreach-goals`)

**Route:** `/settings/outreach-goals`

Features (admin only):
- Create communication targets
- Set metric (emails, calls, texts, all)
- Set period (weekly, monthly)
- Assign to user or role
- Track progress

### Team Management (`/settings/team`)

**Route:** `/settings/team`

Features (admin only):
- View all team members
- Edit user details
- Change roles
- View assigned regions

### Team Productivity (`/team/productivity`)

**Route:** `/team/productivity`

Features (admin only):
- Staff performance metrics
- Tasks completed per user
- Emails sent per user
- Athletes managed per user
- Goal progress per user
- Comparison charts

### Weekly Report (`/team/weekly`)

**Route:** `/team/weekly`

Features (admin only):
- Weekly summary statistics
- Week-over-week comparison
- Top performers
- Areas needing attention

---

## Components

### Layout Components

#### `sidebar.tsx`
Main navigation sidebar.
- Logo and branding
- Navigation groups (Athletes, Revenue, Team)
- User profile section
- Notification badge
- Collapsible on mobile

#### `mobile-header.tsx`
Mobile navigation header.
- Hamburger menu
- Logo
- User avatar
- Notification icon

#### `search-modal.tsx`
Global search modal.
- Search athletes by name
- Quick navigation
- Keyboard shortcut (Cmd+K)

#### `dashboard-providers.tsx`
Wraps app with necessary providers.
- Athlete panel context
- Other contexts as needed

### Athlete Components

#### `athlete-panel.tsx`
Side panel for quick athlete view/edit.
- Opens from list views
- Shows key info
- Edit basic fields
- Close to return

#### `athlete-import-modal.tsx`
Excel/CSV import wizard.
- Drag-and-drop upload
- Sheet selection for multi-sheet files
- Column mapping preview
- Sport selection
- Import progress
- Success/error summary

#### `delete-athlete-button.tsx`
Confirmation button for athlete deletion.
- Shows confirmation dialog
- Prevents accidental deletes

#### `send-email-button.tsx`
Quick email button.
- Opens compose modal
- Pre-fills recipient

#### `pipeline-status-card.tsx`
Shows pipeline information.
- Current stage
- Priority level
- Next action
- Last contact date

### Communication Components

#### `email-compose-modal.tsx`
Rich email composer.
- To/Subject/Body fields
- Template selector
- Send via Gmail API
- Auto-log to communications

#### `email-template-selector.tsx`
Dropdown for email templates.
- Lists available templates
- Shows shared vs personal
- Insert into composer

### Task Components

#### `task-kanban.tsx`
Kanban board for tasks.
- Three columns: todo, in_progress, done
- Drag-and-drop between columns
- Priority badges
- Due date indicators

#### `task-panel.tsx`
Task detail view.
- Full task information
- Edit task
- Add comments
- Change status

#### `task-comments.tsx`
Comment section.
- View all comments
- Add new comment
- @mention users

#### `mention-input.tsx`
Input with @mention support.
- Type @ to see suggestions
- Filter by name
- Insert mention

### Form Components

#### `social-media-fields.tsx`
Social media input fields.
- Instagram handle & followers
- Twitter handle & followers
- TikTok handle & followers
- YouTube channel & subscribers
- NIL valuation

#### `sport-specific-fields.tsx`
Dynamic sport stats fields.
- Changes based on selected sport
- Football: height, weight, 40-time, offers
- Basketball: height, PPG, RPG, APG
- Tennis: UTR rating
- General: height, weight

### Export Components

#### `export-buttons.tsx`
Export functionality.
- Export to CSV
- Export to Excel
- Customizable columns

### Other Components

#### `greeting.tsx`
Personalized greeting.
- Time-based greeting (Good morning/afternoon/evening)
- User's name

---

## API Routes

### Authentication

#### `GET /auth/callback`
Handles Google OAuth callback from Supabase.

**Flow:**
1. Receives auth code from Google
2. Exchanges for session with Supabase
3. Creates user record if new (default role: intern)
4. Updates avatar_url
5. Redirects to /dashboard

### Gmail Integration

#### `GET /api/gmail/auth`
Initiates Gmail OAuth flow.

**Returns:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### `GET /api/gmail/callback`
Handles Gmail OAuth callback.

**Flow:**
1. Exchanges code for tokens
2. Stores tokens in users table
3. Stores connected email address
4. Redirects to /settings

#### `GET /api/gmail/disconnect`
Removes Gmail integration.

**Flow:**
1. Revokes tokens with Google
2. Clears tokens from users table
3. Returns success

#### `POST /api/gmail/send`
Sends email via Gmail API.

**Request Body:**
```json
{
  "to": "recipient@email.com",
  "subject": "Email subject",
  "body": "Email body text",
  "athleteId": "optional-athlete-uuid"
}
```

**Flow:**
1. Validates request
2. Refreshes token if expired
3. Sends via Gmail API
4. Logs to communications_log
5. Returns success

#### `GET /api/gmail/inbox`
Fetches inbox messages.

**Query Params:**
- `maxResults` (default: 20)
- `pageToken` (for pagination)

**Returns:**
```json
{
  "messages": [...],
  "nextPageToken": "..."
}
```

#### `GET /api/gmail/sent`
Fetches sent messages. Same structure as inbox.

#### `GET /api/gmail/status`
Checks Gmail connection status.

**Returns:**
```json
{
  "connected": true,
  "email": "user@gmail.com"
}
```

### Athlete Status & Handoffs

#### `PATCH /api/athletes/[id]/status`
Updates athlete outreach status and triggers automated handoffs.

**Request Body:**
```json
{
  "status": "interested",
  "school_state": "California",    // optional, for signed status
  "roster_team_id": "uuid"         // optional, for signed status
}
```

**Handoff Triggers:**
- Status → "interested" or "in_conversation": Auto-assigns default agent for athlete's region
- Status → "signed": Auto-assigns default marketing lead for athlete's region

**Response:**
```json
{
  "success": true,
  "athlete": { "id": "uuid", "outreach_status": "interested" },
  "handoffs": [
    { "type": "agent", "assignedTo": "John Smith", "taskCreated": true }
  ]
}
```

### Region Assignments

#### `GET /api/settings/region-assignments`
Fetches all region assignments with available agents and marketing users.

**Response:**
```json
{
  "assignments": [
    { "id": "uuid", "region": "Southeast", "default_agent_id": "uuid", "default_marketing_id": "uuid" }
  ],
  "agents": [{ "id": "uuid", "name": "John", "role": "agent" }],
  "marketingUsers": [{ "id": "uuid", "name": "Sarah", "role": "marketing" }]
}
```

#### `PATCH /api/settings/region-assignments`
Updates default agent/marketing for a region. Admin only.

**Request Body:**
```json
{
  "region": "Southeast",
  "default_agent_id": "uuid",
  "default_marketing_id": "uuid"
}
```

---

## Business Logic

### Import System (`src/lib/export.ts`)

#### Column Mapping
Maps 100+ column name variations to standard fields:

```typescript
// Examples of mappings
'first name' → 'first_name'
'last name' → 'last_name'
'ig' → 'instagram'
'instagram handle' → 'instagram'
'ig followers' → 'instagram_followers'
'grad year' → 'eligibility_year'
'class' → 'class_year'
'40 time' → 'forty_yard_dash'
```

#### Data Normalization
- Merges first_name + last_name into name
- Parses combined height/weight fields
- Filters state header rows (IDAHO, MONTANA, etc.)
- Normalizes class year formats ('27, 2027, 27 → '2027')
- Intelligent status parsing:
  - "rejected" → dead_lead
  - "phone call" → in_conversation
  - "followed" → contacted
- Extracts social media into JSON structure
- Extracts sport stats into JSON structure

### Goal Progress (`src/lib/queries/goal-progress.ts`)

#### `getGoalProgressForUser(userId)`
Returns array of goal progress:
```typescript
{
  goalId: string
  goalName: string
  metric: 'emails' | 'calls' | 'texts' | 'all_communications'
  targetCount: number
  currentCount: number
  progress: number // 0-100
  period: 'weekly' | 'monthly'
}
```

#### `getTeamGoalsSummary()`
Returns team aggregate:
```typescript
{
  totalGoals: number
  totalUsers: number
  usersOnTrack: number // progress >= 80%
  averageProgress: number
}
```

### Email Stats (`src/lib/queries/email-stats.ts`)

#### `getEmailStatsOverview()`
Returns email counts by staff:
```typescript
{
  userId: string
  userName: string
  allTime: number
  thisWeek: number
  thisMonth: number
}[]
```

#### `getAthleteEmailCounts(athleteIds)`
Batch query for email counts per athlete.

---

## Authentication

### Flow
1. User visits `/login`
2. Clicks "Sign in with Google"
3. Supabase redirects to Google OAuth
4. User grants permission
5. Google redirects to `/auth/callback`
6. Callback creates/updates user, establishes session
7. User redirected to `/dashboard`

### Middleware (`src/middleware.ts`)
Runs on every request:
- Refreshes session tokens
- Protects dashboard routes
- Redirects unauthenticated users to /login
- Redirects authenticated users from /login to /dashboard

### Protected Routes
- `/dashboard`
- `/athletes`
- `/recruiting`
- `/roster`
- `/pipeline`
- `/brands`
- `/financials`
- `/communications`
- `/email`
- `/tasks`
- `/contracts`
- `/settings`
- `/team`

---

## State Management

### Zustand Store: `usePipelineStore`

```typescript
interface PipelineStore {
  pipelines: Map<string, PipelineData>
  setPipelines: (data: PipelineData[]) => void
  updatePriority: (athleteId: string, priority: Priority) => void
  updateStage: (athleteId: string, stage: PipelineStage) => void
  getPipeline: (athleteId: string) => PipelineData | undefined
}
```

**Features:**
- Optimistic updates (UI updates immediately)
- Background sync to database
- Auto-updates recruiting_status when stage = 'signed_client'

### Context: `AthletePanelContext`

```typescript
interface AthletePanelContext {
  isOpen: boolean
  selectedAthleteId: string | null
  openAthletePanel: (athleteId: string) => void
  closeAthletePanel: () => void
  users: User[]
  rosterTeams: RosterTeam[]
}
```

**Features:**
- Controls athlete side panel
- Pre-fetches users and roster teams for dropdowns
- Triggers page refresh on athlete update

---

## User Roles & Permissions

### Roles

| Role | Description | Access |
|------|-------------|--------|
| `admin` | Full system access | Everything + team management, goals, productivity |
| `agent` | Manages athletes and deals | Athletes, deals, communications, tasks |
| `scout` | Focuses on recruiting | Athletes, recruiting, communications |
| `marketing` | Brand outreach | Athletes, brands, communications |
| `intern` | Limited access (default) | Basic read access |

### Admin-Only Features
- Team Productivity page
- Weekly Report page
- Outreach Goals management
- Team Management
- View all users' email templates

### Role-Based Navigation
Navigation items can be marked `adminOnly: true` to hide from non-admins.

---

## Key Workflows

### Recruiting Workflow

```
1. IMPORT
   └── Upload Excel/CSV with athlete data
   └── System maps columns and normalizes data
   └── Athletes created with outreach_status = 'not_contacted'

2. ASSIGNMENT
   └── Assign scout to evaluate
   └── Assign agent for negotiations
   └── Assign marketing lead for brand opportunities

3. OUTREACH
   └── Log initial contact (email, call, text)
   └── outreach_status → 'contacted'
   └── System tracks last_contacted_date

4. PROGRESSION
   └── Continue communications
   └── Update outreach_status as relationship develops
   └── Update pipeline_stage for detailed tracking

5. DECISION POINT
   └── If interested: outreach_status → 'interested'
   └── If not interested: outreach_status → 'dead_lead'
   └── If need to revisit: outreach_status → 'circling_back'

6. SIGNING
   └── pipeline_stage → 'signing_in_progress'
   └── Negotiate terms
   └── pipeline_stage → 'signed_client'
   └── System auto-sets recruiting_status → 'signed'

7. ROSTER
   └── Athlete now appears in Roster page
   └── Add active deals
   └── Track revenue
```

### Automated Handoffs Workflow

The system automatically assigns staff members when athlete status changes.

```
SETUP (Admin)
   └── Go to Settings > Auto Handoffs
   └── Assign default agent for each region
   └── Assign default marketing lead for each region

SCOUT → AGENT HANDOFF
   └── Scout marks athlete as "Interested" or "In Conversation"
   └── System checks athlete's region
   └── System finds default agent for that region
   └── Auto-assigns agent to athlete (assigned_agent_id)
   └── Creates high-priority task: "Follow up with [Athlete] - newly interested"
   └── Task due in 3 days

AGENT → MARKETING HANDOFF
   └── Agent marks athlete as "Signed"
   └── System checks athlete's region
   └── System finds default marketing lead for that region
   └── Auto-assigns marketing lead (assigned_marketing_lead_id)
   └── Creates high-priority task: "Begin marketing for [Athlete] - newly signed"
   └── Task due in 3 days
```

**Handoff Conditions:**
- Athlete must have a region set
- Athlete must not already have an assignment for that role
- Region must have a default user configured
- Handoff only triggers once (tracked via `handoff_to_agent_at` / `handoff_to_marketing_at`)

**Files Involved:**
| File | Purpose |
|------|---------|
| `/api/athletes/[id]/status/route.ts` | Handles status change and handoff logic |
| `/api/settings/region-assignments/route.ts` | CRUD for region defaults |
| `settings-client.tsx` | Admin UI for configuring defaults |
| `recruiting-client.tsx` | Calls status API on status change |

### Deal Management Workflow

```
1. PROSPECTIVE DEAL (during recruiting)
   └── Add deal with deal_stage = 'prospective'
   └── Used to show athlete potential value
   └── Not counted in revenue until active

2. ACTIVE DEAL (after signing)
   └── Convert to deal_stage = 'active'
   └── Or create new deal
   └── Set deal_type (revenue_share or marketing_brand)

3. TRACKING
   └── payment_status = 'pending' (default)
   └── Set deal_date

4. INVOICING
   └── payment_status → 'invoiced'
   └── Set invoice_date

5. PAYMENT
   └── payment_status → 'paid'
   └── Set payment_date
   └── Revenue now counted in totals
```

### Communication Workflow

```
1. LOG COMMUNICATION
   └── Select athlete (or enter external recipient)
   └── Choose type (email, call, text, zoom)
   └── Enter subject and notes
   └── Optionally set follow-up date

2. FOLLOW-UP TRACKING
   └── Dashboard shows pending follow-ups
   └── Sorted by urgency (overdue, today, tomorrow, upcoming)

3. COMPLETE FOLLOW-UP
   └── Mark as completed
   └── Optionally log new communication

4. EMAIL STATS
   └── System counts all 'email' type communications
   └── Shows per-athlete and per-staff counts
   └── Contributes to outreach goals
```

---

## Import/Export System

### Supported Formats
- CSV (.csv)
- Excel (.xlsx, .xls)

### Import Process
1. User uploads file
2. System detects sheets (Excel may have multiple)
3. User selects sheet(s) or imports all
4. System maps columns using 100+ known variations
5. User selects sport for batch
6. Preview shows mapped data
7. User confirms import
8. System creates athlete records
9. Auto-creates new regions if needed

### Column Mapping Examples

| Input Column | Maps To |
|--------------|---------|
| First Name, first_name, FirstName | first_name |
| Last Name, last_name, LastName | last_name |
| Instagram, IG, ig handle | instagram |
| IG Followers, Instagram Followers | instagram_followers |
| Class, Grad Year, Class Year | class_year |
| 40 Time, 40-Yard, Forty | forty_yard_dash |
| Status, Contact Status | status_text (then parsed) |

### Status Parsing
The system intelligently parses free-text status:

| Input Contains | Maps To |
|----------------|---------|
| "rejected", "representation" | dead_lead |
| "phone", "call", "expecting" | in_conversation |
| "followed", "contacted" | contacted |

### Export Options
- Select which athletes to export
- Choose columns to include
- Export as CSV or Excel
- Includes all data or filtered view

---

## Gmail Integration

### Setup
1. Go to Settings
2. Click "Connect Gmail"
3. Authorize in Google popup
4. Gmail is now connected

### Features
- **Inbox View:** See recent emails in the app
- **Compose:** Write and send emails
- **Templates:** Use pre-made templates
- **Auto-Log:** Sent emails automatically logged as communications
- **Athlete Linking:** Link emails to athlete records

### OAuth Scopes
- `gmail.send` - Send emails
- `gmail.readonly` - Read inbox/sent
- `userinfo.email` - Get user's email address

### Token Management
- Access tokens stored encrypted in database
- Refresh tokens used to get new access tokens
- Automatic refresh when token expires
- Can disconnect anytime from Settings

---

## Environment Variables

### Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL (for OAuth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth (for Gmail integration)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Google Cloud Setup
1. Go to Google Cloud Console
2. Create new project or select existing
3. Enable Gmail API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized redirect URI: `{APP_URL}/api/gmail/callback`
7. Copy Client ID and Client Secret

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── athletes/
│   │   ├── brands/
│   │   ├── communications/
│   │   ├── contracts/
│   │   ├── dashboard/
│   │   ├── email/
│   │   ├── financials/
│   │   ├── pipeline/
│   │   ├── recruiting/
│   │   ├── roster/
│   │   ├── settings/
│   │   ├── tasks/
│   │   ├── team/
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   ├── api/
│   │   └── gmail/             # Gmail API routes
│   ├── auth/
│   │   └── callback/          # OAuth callback
│   ├── login/
│   ├── layout.tsx
│   ├── page.tsx
│   └── not-found.tsx
├── components/
│   ├── athletes/
│   ├── export/
│   ├── forms/
│   ├── import/
│   ├── layout/
│   └── tasks/
├── contexts/
│   └── athlete-panel-context.tsx
├── lib/
│   ├── queries/
│   │   ├── email-stats.ts
│   │   └── goal-progress.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── admin.ts
│   │   └── middleware.ts
│   ├── database.types.ts
│   ├── email-templates.ts
│   ├── export.ts
│   └── sport-fields.ts
├── stores/
│   └── pipeline-store.ts
└── middleware.ts
```

---

## User Guide

### Setting Up Automated Handoffs

Automated handoffs streamline your recruiting workflow by automatically assigning staff when athlete status changes.

#### Step 1: Configure Region Defaults (Admin)

1. Go to **Settings** from the sidebar
2. Click **Auto Handoffs** in the admin section
3. For each region, select:
   - **Default Agent** - Who handles interested athletes
   - **Default Marketing** - Who handles newly signed athletes
4. Changes save automatically

#### Step 2: How It Works

**When a Scout marks an athlete as "Interested" or "In Conversation":**
- The system looks up the athlete's region
- Finds the default agent assigned to that region
- Automatically assigns that agent to the athlete
- Creates a task for the agent with a 3-day deadline

**When an Agent marks an athlete as "Signed":**
- The system looks up the athlete's region
- Finds the default marketing lead for that region
- Automatically assigns the marketing lead to the athlete
- Creates a task to begin marketing with a 3-day deadline

#### Requirements
- Athlete must have a **region** set (imported or manually entered)
- Region must have a **default user configured** in Settings
- Works from the **Recruiting** page when changing status

#### Tips
- Assign agents who specialize in specific regions
- The handoff only happens once per athlete (won't re-assign if already assigned)
- Check **Tasks** page to see auto-created follow-up tasks
- Manual assignments always take priority over automatic ones

---

## Contributing

### Code Style
- TypeScript strict mode
- ESLint with Next.js config
- Tailwind CSS for styling
- No inline styles

### Commit Messages
- Use conventional commits
- Examples: `feat:`, `fix:`, `docs:`, `refactor:`

### Pull Requests
- Create feature branch
- Write descriptive PR title
- Include screenshots for UI changes
- Ensure all checks pass

---

## Support

For issues or questions:
- GitHub Issues: [Repository Issues](https://github.com/mokeyzz1/athletedesk-crm/issues)

---

*Last updated: April 2026*
