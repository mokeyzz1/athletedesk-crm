# AthleteDesk - Sports Agency CRM

A comprehensive CRM platform built for sports agencies to manage athletes, recruiting pipelines, brand deals, team operations, and revenue tracking.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Pages & Routes](#pages--routes)
- [Components](#components)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Gmail Integration](#gmail-integration)
- [Current Status](#current-status)

---

## Overview

AthleteDesk is an all-in-one solution for sports agencies to:

- Manage athlete rosters with detailed profiles and sport-specific stats
- Track recruiting pipelines from prospect to signed client
- Handle brand partnerships and NIL deal negotiations
- Monitor revenue, agency fees, and payment status
- Coordinate team communications and task assignments
- Store and manage contracts and documents

**Target Users**: Sports agents, scouts, marketing teams, and agency administrators.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14.2.21 (App Router) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 3.4 |
| Database | Supabase (PostgreSQL) |
| Authentication | Google OAuth via Supabase Auth |
| File Storage | Supabase Storage |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Data Export | xlsx library |
| Fonts | Inter (body), Playfair Display (headings) |

---

## Features

### 1. Athletes Module

**Athlete Profiles** (`/athletes`)
- Full profile management with contact info, school, position
- Sport-specific stats (dynamically rendered based on sport)
- Social media tracking with follower counts
- Marketability score (0-100)
- Profile image support
- Duplicate detection when creating new athletes

**Supported Sports with Custom Fields**:
| Sport | Custom Fields |
|-------|---------------|
| Football | Height, Weight, 40-yard dash, Position group, School offers, Hudl link |
| Basketball | Height, Weight, Position, PPG, Recruiting ranking, Offers |
| Track & Field | Primary event, Personal best, National ranking, Conference |
| Soccer | Position, Goals, Assists, Club team, International eligibility |
| Tennis | UTR Rating, Singles ranking, Doubles ranking |
| Baseball | Position, Batting average, ERA, Velocity, Offers |

**Social Media Fields**:
- Instagram (handle + followers)
- Twitter/X (handle + followers)
- TikTok (handle + followers)
- YouTube (channel + subscribers)
- NIL valuation estimate

**Status Tracking**:
- Recruiting Status: `not_recruiting` | `open_to_contact` | `actively_recruiting` | `committed` | `signed`
- Transfer Portal: `not_in_portal` | `entered_portal` | `committed` | `transferred`
- League Level: `high_school` | `college` | `professional` | `international`

**Staff Assignments**:
- Assigned Scout
- Assigned Agent
- Marketing Lead

---

### 2. Recruiting Pipeline (`/pipeline`)

Kanban-style drag-and-drop board with 7 stages:

1. **Prospect Identified** - Initial discovery
2. **Scout Evaluation** - Under review by scouts
3. **Initial Contact** - First outreach made
4. **Recruiting Conversation** - Active discussions
5. **Interested** - Athlete showing interest
6. **Signing in Progress** - Contract negotiations
7. **Signed Client** - Deal closed

Each pipeline card shows:
- Athlete name and sport
- Priority level (high/medium/low)
- Last contact date
- Next action item

---

### 3. Brand Outreach (`/brands`)

Track brand partnerships and NIL opportunities:

**Fields**:
- Brand name and contact info
- Associated athlete
- Outreach method: `email` | `phone` | `linkedin` | `event`
- Response status: `no_response` | `interested` | `not_interested` | `in_discussion` | `deal_closed`
- Deal value and product value
- Campaign details
- Follow-up dates

---

### 4. Financials (`/financials`)

Revenue and deal tracking:

**Deal Records Include**:
- Deal name and associated athlete
- Deal value (total)
- Agency percentage (commission rate)
- Agency fee (auto-calculated)
- Athlete payout (auto-calculated)
- Payment status: `pending` | `invoiced` | `paid`
- Deal date, invoice date, payment date

**Dashboard Metrics**:
- Total lifetime revenue
- Pending revenue
- This month's deals and agency fees

---

### 5. Communications (`/communications`)

Log all athlete interactions:

**Communication Types**: `email` | `call` | `text` | `zoom`

**Features**:
- Subject and detailed notes
- Follow-up date scheduling
- Follow-up completion tracking
- Bulk actions (mark complete, assign to team member)
- Filter by athlete, type, follow-up status

---

### 6. Tasks (`/tasks`)

Team task management system:

**Task Board** (Kanban):
- Todo
- In Progress
- Done

**Task Properties**:
- Title and description
- Assigned team member
- Associated athlete (optional)
- Due date
- Priority: `high` | `medium` | `low`
- Status: `todo` | `in_progress` | `done`

**Task Comments**:
- Threaded comments on each task
- @mentions to notify team members
- Mention notifications in sidebar

---

### 7. Documents / Contracts (`/contracts`)

Document management system:

**Document Types**:
- Contract
- Agreement
- NIL Deal
- Medical Records
- Academic Records
- Scouting Report

**Features**:
- File upload to Supabase Storage
- Filter by athlete, document type, status
- Download functionality
- Status tracking: `pending` | `signed` | `expired`

---

### 8. Team Management (`/settings/team`)

Admin-only team features:

**User Roles**:
| Role | Description |
|------|-------------|
| Admin | Full access, can invite members and manage roles |
| Agent | Manages athletes and deals |
| Scout | Evaluates and recruits prospects |
| Marketing | Handles brand outreach and social media |
| Intern | Limited access for training |

**Features**:
- Invite new team members via email
- OTP verification for new accounts
- Role assignment and management

---

### 9. Gmail Integration

Send emails directly from the app:

**Setup**:
- Connect Gmail account via OAuth in Settings
- Requires Gmail API credentials (see Environment Variables)

**Email Templates**:
| Template | Use Case |
|----------|----------|
| Initial Outreach | First contact with athlete |
| Follow-up | Re-engaging after no response |
| Contract Discussion | Sending contract details |
| NIL Opportunity | Presenting brand deal |
| Signing Invitation | Scheduling signing meeting |

**Template Variables**:
- `{{athlete_name}}`, `{{user_name}}`, `{{agency_name}}`
- `{{school}}`, `{{brand_name}}`

---

### 10. Dashboard (`/dashboard`)

Real-time overview with:

**KPI Cards**:
- Total Athletes
- Signed Clients
- In Transfer Portal
- Active Brand Discussions

**Revenue Section**:
- Total lifetime revenue
- Pending revenue
- This month's agency fees

**Widgets**:
- My Tasks (assigned to current user)
- Upcoming Follow-ups (with overdue indicators)
- Active Brand Discussions
- Recent Athletes
- Activity Feed (communications, deals, documents)

**Notifications** (sidebar):
- Overdue follow-ups
- Today's follow-ups
- Pending contracts awaiting signature
- @mentions in task comments

---

### 11. Search

Global search modal (Cmd/Ctrl + K):
- Search athletes by name
- Search across the system

---

### 12. Mobile Support

- Fully responsive design
- Mobile header with hamburger menu
- Touch-friendly Kanban boards
- Collapsible sidebar on desktop

---

### 13. Data Export

Export data to CSV/Excel:
- Athletes list
- Financial records
- Communications log

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/           # Authenticated routes (layout with sidebar)
│   │   ├── dashboard/         # Main dashboard
│   │   ├── athletes/          # Athletes CRUD
│   │   │   ├── page.tsx       # List all athletes
│   │   │   ├── new/           # Create athlete
│   │   │   └── [id]/          # View/edit athlete
│   │   ├── pipeline/          # Recruiting Kanban
│   │   ├── brands/            # Brand outreach
│   │   │   └── new/           # Log new outreach
│   │   ├── financials/        # Revenue tracking
│   │   │   └── new/           # Create deal record
│   │   ├── communications/    # Communication logs
│   │   │   └── new/           # Log communication
│   │   ├── tasks/             # Task management
│   │   │   ├── new/           # Create task
│   │   │   └── [id]/          # Task detail with comments
│   │   ├── contracts/         # Document management
│   │   └── settings/          # User settings
│   │       └── team/          # Team management (admin)
│   ├── api/
│   │   └── gmail/             # Gmail OAuth & send endpoints
│   │       ├── auth/          # Initiate OAuth
│   │       ├── callback/      # OAuth callback
│   │       ├── disconnect/    # Revoke access
│   │       ├── status/        # Check connection
│   │       └── send/          # Send email
│   ├── login/                 # Login page
│   └── page.tsx               # Root redirect
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx        # Main navigation sidebar
│   │   ├── mobile-header.tsx  # Mobile navigation
│   │   └── search-modal.tsx   # Global search
│   ├── forms/
│   │   ├── sport-specific-fields.tsx  # Dynamic sport stats
│   │   └── social-media-fields.tsx    # Social media inputs
│   ├── tasks/
│   │   ├── task-kanban.tsx    # Kanban board
│   │   ├── task-panel.tsx     # Task detail panel
│   │   ├── task-comments.tsx  # Comments section
│   │   └── mention-input.tsx  # @mention autocomplete
│   ├── export/
│   │   └── export-buttons.tsx # CSV/Excel export
│   ├── import/
│   │   └── athlete-import-modal.tsx  # Bulk import
│   ├── email-compose-modal.tsx       # Email composer
│   ├── email-template-selector.tsx   # Template picker
│   └── greeting.tsx                  # Time-based greeting
└── lib/
    ├── supabase/
    │   ├── client.ts          # Browser Supabase client
    │   └── server.ts          # Server Supabase client
    ├── database.types.ts      # Generated TypeScript types
    ├── email-templates.ts     # Email template definitions
    └── sport-fields.ts        # Sport-specific field configs
```

---

## Database Schema

### Tables

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Full name |
| email | text | Email address |
| role | user_role | admin, agent, scout, marketing, intern |
| google_sso_id | text | Supabase Auth user ID |
| avatar_url | text | Profile image URL |
| created_at | timestamp | |
| updated_at | timestamp | |

#### `athletes`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Full name |
| email | text | Contact email |
| phone | text | Phone number |
| school | text | Current school |
| sport | text | Primary sport |
| position | text | Playing position |
| league_level | league_level | high_school, college, professional, international |
| eligibility_year | integer | Graduation/eligibility year |
| recruiting_status | recruiting_status | Current recruiting state |
| transfer_portal_status | transfer_portal_status | Portal state |
| marketability_score | integer | 0-100 score |
| sport_specific_stats | jsonb | Dynamic sport stats |
| social_media | jsonb | Social media handles/followers |
| assigned_scout_id | uuid | FK to users |
| assigned_agent_id | uuid | FK to users |
| assigned_marketing_lead_id | uuid | FK to users |
| profile_image_url | text | Profile photo |
| notes | text | Internal notes |

#### `recruiting_pipeline`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| athlete_id | uuid | FK to athletes |
| pipeline_stage | pipeline_stage | Current stage |
| priority | priority_level | high, medium, low |
| last_contact_date | date | |
| next_action | text | Next step |
| notes | text | Pipeline notes |

#### `communications_log`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| athlete_id | uuid | FK to athletes |
| staff_member_id | uuid | FK to users |
| communication_date | date | When it happened |
| type | communication_type | email, call, text, zoom |
| subject | text | Subject/topic |
| notes | text | Details |
| follow_up_date | date | When to follow up |
| follow_up_completed | boolean | Is follow-up done |

#### `brand_outreach`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| brand_name | text | Brand/company name |
| brand_contact_name | text | Contact person |
| brand_contact_email | text | Contact email |
| staff_member_id | uuid | FK to users |
| athlete_id | uuid | FK to athletes |
| date_contacted | date | Outreach date |
| outreach_method | outreach_method | email, phone, linkedin, event |
| response_status | response_status | Current status |
| deal_value | numeric | Potential/actual value |
| product_value | numeric | Value of products |
| campaign_details | text | Campaign info |
| follow_up_date | date | Next follow-up |

#### `financial_tracking`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| athlete_id | uuid | FK to athletes |
| brand_outreach_id | uuid | FK to brand_outreach (optional) |
| deal_name | text | Name of deal |
| deal_value | numeric | Total value |
| agency_percentage | numeric | Commission rate |
| agency_fee | numeric | **Generated**: deal_value * agency_percentage |
| athlete_payout | numeric | **Generated**: deal_value - agency_fee |
| payment_status | payment_status | pending, invoiced, paid |
| deal_date | date | When deal was made |
| invoice_date | date | When invoiced |
| payment_date | date | When paid |

#### `documents`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| athlete_id | uuid | FK to athletes |
| uploaded_by | uuid | FK to users |
| name | text | File name |
| file_type | text | MIME type |
| file_size | integer | Size in bytes |
| storage_path | text | Supabase Storage path |
| document_type | text | contract, agreement, nil_deal, etc. |
| status | text | pending, signed, expired |
| notes | text | |

#### `tasks`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Task title |
| description | text | Details |
| assigned_to | uuid | FK to users |
| created_by | uuid | FK to users |
| athlete_id | uuid | FK to athletes (optional) |
| due_date | date | Deadline |
| priority | priority_level | high, medium, low |
| status | task_status | todo, in_progress, done |

#### `task_comments`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_id | uuid | FK to tasks |
| author_id | uuid | FK to users |
| content | text | Comment text |

#### `comment_mentions`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| comment_id | uuid | FK to task_comments |
| mentioned_user_id | uuid | FK to users |
| is_read | boolean | Has user seen it |

### Views

#### `dashboard_summary`
Aggregated metrics for the dashboard:
- total_athletes
- actively_recruiting
- in_portal
- signed_clients
- active_brand_discussions
- total_revenue
- pending_revenue

#### `athletes_with_pipeline`
Athletes joined with their pipeline stage and assigned staff names.

#### `pending_follow_ups`
Communications with incomplete follow-ups, showing athlete and staff info.

### Enums

```sql
user_role: admin, agent, scout, marketing, intern
league_level: high_school, college, professional, international
recruiting_status: not_recruiting, open_to_contact, actively_recruiting, committed, signed
transfer_portal_status: not_in_portal, entered_portal, committed, transferred
communication_type: email, call, text, zoom
pipeline_stage: prospect_identified, scout_evaluation, initial_contact, recruiting_conversation, interested, signing_in_progress, signed_client
priority_level: high, medium, low
outreach_method: email, phone, linkedin, event
response_status: no_response, interested, not_interested, in_discussion, deal_closed
payment_status: pending, invoiced, paid
task_status: todo, in_progress, done
```

---

## Pages & Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Redirects to /dashboard or /login | - |
| `/login` | Google OAuth login | No |
| `/dashboard` | Main dashboard with KPIs | Yes |
| `/athletes` | List all athletes | Yes |
| `/athletes/new` | Create new athlete | Yes |
| `/athletes/[id]` | View athlete detail | Yes |
| `/athletes/[id]/edit` | Edit athlete | Yes |
| `/pipeline` | Recruiting Kanban board | Yes |
| `/brands` | Brand outreach list | Yes |
| `/brands/new` | Log new brand outreach | Yes |
| `/financials` | Financial tracking | Yes |
| `/financials/new` | Create deal record | Yes |
| `/communications` | Communication logs | Yes |
| `/communications/new` | Log new communication | Yes |
| `/tasks` | Task Kanban board | Yes |
| `/tasks/new` | Create new task | Yes |
| `/tasks/[id]` | Task detail with comments | Yes |
| `/contracts` | Document management | Yes |
| `/settings` | User settings, Gmail integration | Yes |
| `/settings/team` | Team management (admin only) | Yes (Admin) |

---

## Components

### Layout Components
- **Sidebar** (`sidebar.tsx`) - Main navigation with collapsible state, notifications, user menu
- **MobileHeader** (`mobile-header.tsx`) - Mobile navigation with hamburger menu
- **SearchModal** (`search-modal.tsx`) - Global search overlay

### Form Components
- **SportSelect** - Dropdown for sport selection with "Other" option
- **SportSpecificFields** - Dynamic stat fields based on selected sport
- **SocialMediaFields** - Instagram, Twitter, TikTok, YouTube inputs

### Task Components
- **TaskKanban** - Drag-and-drop task board
- **TaskPanel** - Slide-out task detail panel
- **TaskComments** - Threaded comments
- **MentionInput** - @mention autocomplete input

### Export Components
- **ExportButtons** - CSV and Excel download buttons

### Email Components
- **EmailComposeModal** - Email composition dialog
- **EmailTemplateSelector** - Template picker with preview

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Google Cloud Console project (for Gmail API)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd athletedesk

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev

# Open http://localhost:3000
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:types` | Regenerate Supabase types |

---

## Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Gmail OAuth (optional - for email integration)
GMAIL_CLIENT_ID=your-google-client-id
GMAIL_CLIENT_SECRET=your-google-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# For generating types
SUPABASE_PROJECT_ID=your-project-id
```

---

## Gmail Integration

### Setup Steps

1. **Google Cloud Console**:
   - Create a new project
   - Enable Gmail API
   - Create OAuth 2.0 credentials (Web application)
   - Add redirect URI: `https://your-domain.com/api/gmail/callback`

2. **Environment Variables**:
   - Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`

3. **Connect Account**:
   - Go to Settings in the app
   - Click "Connect Gmail"
   - Authorize access

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gmail/auth` | GET | Initiate OAuth flow |
| `/api/gmail/callback` | GET | OAuth callback handler |
| `/api/gmail/status` | GET | Check connection status |
| `/api/gmail/send` | POST | Send email |
| `/api/gmail/disconnect` | POST | Revoke access |

---

## Current Status

### Completed Features
- [x] Google OAuth authentication
- [x] Athlete CRUD with sport-specific stats
- [x] Recruiting pipeline Kanban
- [x] Brand outreach tracking
- [x] Financial tracking with auto-calculations
- [x] Communications logging with follow-ups
- [x] Task management with Kanban and comments
- [x] @mentions in task comments
- [x] Document upload and management
- [x] Gmail integration for sending emails
- [x] Email templates
- [x] Team management with roles
- [x] Dashboard with KPIs and activity feed
- [x] Notifications (follow-ups, mentions, contracts)
- [x] Global search
- [x] Data export (CSV/Excel)
- [x] Mobile responsive design
- [x] Duplicate athlete detection

### Future Enhancements
- [ ] Advanced analytics with charts and trends
- [ ] Calendar integration (Google Calendar)
- [ ] Automated email sequences
- [ ] Webhook support for integrations
- [ ] Bulk athlete import from CSV
- [ ] Mobile app (React Native)
- [ ] Two-factor authentication
- [ ] Audit logging

---

## License

Private - All rights reserved.
