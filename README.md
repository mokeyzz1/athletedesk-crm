# AthleteDesk

CRM for sports agencies. Recruiting, deals, contracts, revenue — all in one place.

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

## Why I Built This

Sports agents I talked to were using spreadsheets for athletes, email for outreach, another app for contracts, and sticky notes for follow-ups. They'd forget to call someone back and lose a deal. They'd calculate commissions by hand and get it wrong.

So I built a system where everything lives in one place. You can see where every prospect is in your pipeline, what deals are in progress, and who on your team is handling what.

---

## What It Does

**Recruiting Pipeline**
- Drag prospects through 7 stages (Not Contacted → Signed)
- Track sport-specific stats for football, basketball, baseball, soccer, tennis, track
- Set follow-up reminders so you don't forget

**Deals & Revenue**
- Enter a deal value and agency percentage, it calculates the split automatically
- Track payment status from pending to paid
- See your total revenue at a glance

**Team Stuff**
- 5 roles (Admin, Agent, Scout, Marketing, Intern) with different access levels
- Assign multiple people to the same athlete
- Log every call, email, and meeting

**Integrations**
- Gmail for sending emails
- Google Calendar for scheduling
- DocuSign for contracts
- Calendly for booking links
- Apollo for finding brand contacts

---

## How It Works

Each agency gets their own workspace. When you log in, you see your athletes, your deals, your team. The system handles the separation.

Signup is invite-only — admins control who joins. You can sign in with Google or email/password, and if you use both with the same email, it's the same account.

The pipeline updates instantly when you drag cards around. It syncs to the database in the background so it doesn't feel slow.

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth + Storage)
- Vercel

---

## Author

**Moses Koroma** — [@mokeyzz1](https://github.com/mokeyzz1)
