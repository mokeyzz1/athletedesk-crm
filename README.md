# AthleteDesk

A sports agency was managing hundreds of athletes, brand deals, and contracts across disconnected spreadsheets. Scouts had no way to know who'd been contacted. Agents had no structured handoffs. Leadership had no visibility. I built AthleteDesk to fix that.

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

**Recruiting Database** — All prospects organized by region and class year. Every scout sees their assigned region. Admin sees all regions with real-time outreach progress.

**Roster** — Signed clients only. Revenue Share contracts and Marketing/Brand deals tracked separately, with agency fee and athlete payout auto-calculated.

**Automated Handoffs** — When a scout qualifies an athlete the system auto-assigns an agent. When an athlete signs, marketing is automatically notified. No manual coordination.

**Brand Outreach** — Track every brand partnership from first contact to deal closed. Attach potential deals to prospects as a pitch tool.

**Communications** — Every call, email, text, and meeting logged to the athlete's profile. Full history across the entire team.

**Gmail Integration** — Send emails directly from the CRM, attach files, and schedule follow-ups. Every sent email automatically logged.

**Team Visibility** — Leadership sees staff activity, outreach completion by region, and goal progress — all in real time.

**Excel Import** — Existing recruiting spreadsheets import directly. Each sheet becomes a region, athletes populate automatically.

---

## Stack

- Next.js 14
- TypeScript
- Supabase
- PostgreSQL
- Tailwind CSS
- Google OAuth
- Gmail API
- Vercel

---

## Scheduled Email Operations

Scheduled emails are stored in AthleteDesk and sent later through the sender's connected Gmail account. Gmail does not provide a native public API for scheduled send, so the CRM owns the queue.

- Scheduled email rows live in `scheduled_emails`.
- Scheduled attachments are stored in the private Supabase Storage bucket `email-attachments`.
- Vercel Cron calls `/api/gmail/scheduled/process` every 5 minutes.
- Delivery is near-time: an email scheduled for 2:01 PM may send at the next processor run, such as 2:05 PM.
- Production must be deployed under the Pro Vercel scope `turn-logic-ai`, project `athletedesk-crm`.
- `CRON_SECRET` must be set in Vercel Production.

Verify cron after deploy:

```bash
npx vercel crons ls --scope turn-logic-ai
```

Expected:

```txt
/api/gmail/scheduled/process    */5 * * * *
```

---

## Author

**Moses Koroma** — [@mokeyzz1](https://github.com/mokeyzz1)
