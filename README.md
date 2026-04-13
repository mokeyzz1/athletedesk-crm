# AthleteDesk

A full-stack SaaS CRM platform for sports agencies to manage athlete recruiting, brand partnerships, contracts, and revenue tracking.

**Live:** [athletedesk.io](https://athletedesk.io)

---

## Screenshots

<!-- Add your screenshots here -->
| Dashboard | Recruiting Pipeline |
|-----------|---------------------|
| ![Dashboard](screenshots/dashboard.png) | ![Pipeline](screenshots/pipeline.png) |

| Athlete Profile | Brand Outreach |
|-----------------|----------------|
| ![Athlete](screenshots/athlete.png) | ![Brands](screenshots/brands.png) |

---

## Features

- **Athlete Management** - Profiles with sport-specific stats, social media tracking, marketability scores
- **Recruiting Pipeline** - Drag-and-drop Kanban board with 7 stages
- **Brand Partnerships** - Track outreach, negotiations, and NIL deals
- **Financial Tracking** - Auto-calculated agency fees, payment status, revenue dashboards
- **Team Collaboration** - Role-based access, task management, @mentions
- **Communications** - Log calls, emails, texts with follow-up reminders
- **Document Management** - Upload and track contracts, agreements
- **Integrations** - Gmail, Google Calendar, DocuSign, Calendly, Apollo

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth + Email/Password) |
| Storage | Supabase Storage |
| Deployment | Vercel |

---

## Architecture Highlights

### Multi-Tenancy
- Complete organization isolation with Row Level Security (50+ RLS policies)
- Each agency's data is completely separated at the database level

### Authentication
- Dual auth: Google OAuth + Email/Password
- Identity linking (same email = same account across providers)
- Invite-only signup with onboarding flow

### Security
- Server Actions for all mutations (guaranteed org_id injection)
- Provider-neutral `auth_user_id` system
- PKCE flow for OAuth

### Testing
- 97 automated tests with Vitest
- Server action tests, RLS pattern tests, utility tests

---

## Key Technical Decisions

| Challenge | Solution |
|-----------|----------|
| Data isolation between agencies | PostgreSQL RLS policies, not app-level filtering |
| Secure mutations | Next.js Server Actions inject org_id server-side |
| Multiple auth providers | Provider-neutral `auth_user_id` with email-based identity linking |
| Real-time Kanban | Optimistic UI updates with Zustand, background sync |
| Sport-specific fields | JSONB columns with dynamic form rendering |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Authenticated routes
│   ├── api/                # API routes & webhooks
│   ├── admin/              # Super admin panel
│   └── auth/               # Auth callbacks
├── components/             # React components
├── lib/                    # Utilities, types, integrations
│   ├── actions/            # Server Actions
│   ├── integrations/       # OAuth integrations
│   └── supabase/           # Supabase clients
└── stores/                 # Zustand stores
```

---

## Author

**Moses Koroma**

- GitHub: [@mokeyzz1](https://github.com/mokeyzz1)

