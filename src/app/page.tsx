import Link from 'next/link'
import {
  DEMO_USER_EMAIL,
  DEMO_PASSWORD_HINT,
  SHOW_DEMO_CREDENTIALS,
  buildDemoAccessMailto,
} from '@/lib/demo'

function HandoffCard({
  role,
  accent,
  badgeTone,
  description,
  bullets,
  triggerLabel,
}: {
  role: string
  accent: string
  badgeTone: string
  description: string
  bullets: string[]
  triggerLabel?: string
}) {
  return (
    <div className="relative">
      <div className={`relative rounded-3xl border ${accent} p-6 backdrop-blur-sm`}>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${badgeTone}`}>
          <span className="h-1 w-1 rounded-full bg-current" />
          {role}
        </div>
        <p className="mt-4 text-base font-medium text-white">{description}</p>
        <ul className="mt-4 space-y-2">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-2 text-sm text-brand-200">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      {triggerLabel && (
        <div className="mt-3 text-center text-xs font-medium text-brand-400 lg:absolute lg:-right-3 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2 lg:translate-x-full lg:whitespace-nowrap lg:text-left">
          <span className="rounded-full border border-white/10 bg-brand-950/80 px-3 py-1 backdrop-blur">{triggerLabel}</span>
        </div>
      )}
    </div>
  )
}

function BentoCard({
  eyebrow,
  title,
  body,
  icon,
}: {
  eyebrow: string
  title: string
  body: string
  icon: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.05]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
        </svg>
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-brand-400">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-brand-200">{body}</p>
    </div>
  )
}

function HeroDashboardMockup() {
  const sidebarItems: { d: string; active?: boolean }[] = [
    { d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', active: true },
    { d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ]
  const stats = [
    { label: 'Total Athletes', value: '737' },
    { label: 'Signed Clients', value: '30' },
    { label: 'In Portal', value: '120' },
    { label: 'Brand Talks', value: '16' },
  ]
  const athletes = [
    { initials: 'ML', name: 'Marcus Lee', meta: 'Football · Alabama', pill: 'Signed', pillTone: 'bg-green-100 text-green-700' },
    { initials: 'SK', name: 'Sarah Kim', meta: 'Track · Oregon', pill: 'Interested', pillTone: 'bg-yellow-100 text-yellow-700' },
    { initials: 'JC', name: 'Jordan Cruz', meta: 'Basketball · UCLA', pill: 'In Conversation', pillTone: 'bg-indigo-100 text-indigo-700' },
    { initials: 'DH', name: 'Devon Hayes', meta: 'Wrestling · Iowa', pill: 'Contacted', pillTone: 'bg-blue-100 text-blue-700' },
  ]

  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-500/30 via-brand-400/10 to-emerald-500/20 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-brand-950 shadow-2xl shadow-black/50">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.04] px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <div className="ml-3 flex-1 truncate rounded-md bg-black/30 px-2 py-0.5 text-center text-[10px] text-white/40">
            app.athletedesk.com/dashboard
          </div>
        </div>
        {/* App body */}
        <div className="flex bg-gray-50">
          {/* Real-looking sidebar with left-rail accent */}
          <div className="flex w-12 flex-shrink-0 flex-col items-center bg-brand-900 py-3">
            <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-brand-600">AD</div>
            <div className="flex flex-col items-center gap-1">
              {sidebarItems.map((item, i) => (
                <div key={i} className="relative flex h-7 w-9 items-center justify-center">
                  {item.active && (
                    <span className="absolute -left-1 top-1 bottom-1 w-0.5 rounded-r-full bg-white" />
                  )}
                  <svg className={`h-4 w-4 ${item.active ? 'text-white' : 'text-brand-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.d} />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Greeting bar */}
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Good morning, Ava 👋</p>
              <p className="text-[11px] text-gray-500">You have 3 follow-ups due today</p>
            </div>

            <div className="space-y-3 p-3 sm:p-4">
              {/* Stat cards — matches real dashboard */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map(s => (
                  <div key={s.label} className="rounded border border-gray-200 bg-white p-2.5">
                    <p className="truncate text-[9px] font-medium uppercase tracking-wide text-gray-500">{s.label}</p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Athletes card */}
              <div className="rounded border border-gray-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-900">Recent Athletes</p>
                  <span className="text-[10px] font-medium text-brand-600">View all</span>
                </div>
                <div className="space-y-0.5">
                  {athletes.map(a => (
                    <div key={a.name} className="flex items-center gap-2 rounded px-1.5 py-1.5 hover:bg-gray-50">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
                        {a.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-gray-900">{a.name}</p>
                        <p className="truncate text-[10px] text-gray-500">{a.meta}</p>
                      </div>
                      <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ${a.pillTone}`}>
                        {a.pill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PipelineMockup() {
  // Matches OUTREACH_COLUMNS in the real recruiting page
  const cols: { name: string; border: string; bg: string; items: { name: string; meta: string }[] }[] = [
    {
      name: 'Contacted',
      border: 'border-blue-300',
      bg: 'bg-blue-50',
      items: [
        { name: 'Devon Hayes', meta: 'Wrestling · 2026' },
        { name: 'Tyler Ross', meta: 'Football · 2025' },
      ],
    },
    {
      name: 'Interested',
      border: 'border-yellow-300',
      bg: 'bg-yellow-50',
      items: [
        { name: 'Sarah Kim', meta: 'Track · 2025' },
        { name: 'Alex Park', meta: 'Basketball · 2026' },
      ],
    },
    {
      name: 'Signed',
      border: 'border-green-300',
      bg: 'bg-green-50',
      items: [
        { name: 'Marcus Lee', meta: 'Football · 2025' },
      ],
    },
  ]
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="grid grid-cols-3 gap-px bg-gray-100">
        {cols.map(col => (
          <div key={col.name} className="bg-white">
            <div className={`border-b-2 ${col.border} bg-gray-50 px-2 py-1.5`}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-gray-700">{col.name}</p>
                <span className="text-[9px] font-medium text-gray-500">{col.items.length}</span>
              </div>
            </div>
            <div className={`${col.bg} space-y-1.5 p-1.5`}>
              {col.items.map(item => (
                <div key={item.name} className="rounded border border-gray-200 bg-white p-1.5 shadow-sm">
                  <p className="text-[10px] font-medium text-gray-900">{item.name}</p>
                  <p className="text-[9px] text-gray-500">{item.meta}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InboxMockup() {
  // Matches the real email list styling
  const threads: { initials: string; from: string; subject: string; preview: string; when: string; unread: boolean }[] = [
    { initials: 'CP', from: 'Coach Patterson', subject: 'Re: Visit weekend', preview: 'Looks good — we can host him Saturday morning.', when: '2h', unread: true },
    { initials: 'SK', from: 'Sarah Kim', subject: 'Updated 400m times', preview: 'Just ran a 52.1 at regionals this weekend!', when: '5h', unread: true },
    { initials: 'ML', from: 'Marcus Lee — parent', subject: 'NIL paperwork question', preview: 'Wanted to confirm the W-9 deadline before…', when: '1d', unread: false },
    { initials: 'JC', from: 'Jordan Cruz', subject: 'Re: Apparel deal', preview: 'I\'m in. When can we get on a call?', when: '2d', unread: false },
  ]
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[11px] text-gray-500">Inbox</span>
          <span className="ml-auto rounded bg-brand-100 px-1.5 py-0.5 text-[9px] font-semibold text-brand-700">2 unread</span>
        </div>
      </div>
      <div>
        {threads.map((t, idx) => (
          <div
            key={t.from}
            className={`flex items-start gap-2 px-3 py-2 ${idx > 0 ? 'border-t border-gray-100' : ''} ${t.unread ? 'bg-blue-50/40' : 'bg-white'}`}
          >
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
              {t.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={`truncate text-[11px] ${t.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{t.from}</p>
                <span className="text-[9px] text-gray-400">{t.when}</span>
              </div>
              <p className={`truncate text-[11px] ${t.unread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>{t.subject}</p>
              <p className="truncate text-[10px] text-gray-500">{t.preview}</p>
            </div>
            {t.unread && <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />}
          </div>
        ))}
      </div>
    </div>
  )
}

const workflow = [
  {
    step: '01',
    title: 'Import or add prospects',
    body: 'Upload an Excel list by region or add athletes one-by-one. Sport, school, contact info, recruiting status — all on the athlete profile.',
  },
  {
    step: '02',
    title: 'Scouts work the pipeline',
    body: 'Log calls, emails, and meetings. Mark prospects "interested" and the system auto-hands them off to the right agent.',
  },
  {
    step: '03',
    title: 'Agents close, marketing takes over',
    body: 'When an athlete signs, marketing is automatically assigned to manage their brand deals and roster activity.',
  },
  {
    step: '04',
    title: 'Track revenue & report',
    body: 'Every deal, every fee, every follow-up. Monthly dashboards, team productivity, and full activity audit trail.',
  },
]

const faqs = [
  {
    q: 'Who is this built for?',
    a: 'Full-service NIL agencies and sports agencies managing athletes across multiple sports and regions. In production with agencies running football, basketball, track & field, and wrestling rosters — 700+ athletes across 7 regions.',
  },
  {
    q: 'What sports does it support?',
    a: 'Sport-agnostic. Currently in use for football, basketball, track & field, and wrestling. Sport-specific fields where it matters; flexible where it doesn\'t.',
  },
  {
    q: 'How does Gmail integration work?',
    a: 'Connect your Gmail with one click. Emails sent from the CRM go through your Gmail account and auto-log to the athlete\'s communication history. Your inbox is searchable inside the app.',
  },
  {
    q: 'Can I import existing athlete data?',
    a: 'Yes. Excel and CSV import with multi-sheet support (one sheet per region), smart column mapping, and auto-creation of regions and teams. Hundreds of rows in one upload.',
  },
  {
    q: 'How does the demo work?',
    a: 'Click "Try the Demo" to open a seeded sandbox with athletes, tasks, pipeline movement, communications, and deals. It is safe to explore and does not touch any live client workspace.',
  },
  {
    q: 'How do I get my own account?',
    a: 'Demo accounts are open. Real agency accounts are invite-only while we onboard new clients. Email us to request access.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-950 text-white">
      {/* Nav */}
      <header className="border-b border-white/5">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              <span className="text-sm font-bold text-brand-600">AD</span>
            </div>
            <span className="text-lg font-semibold">AthleteDesk</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-white/70 transition-colors hover:text-white sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/api/demo"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-900 transition-transform hover:scale-[1.02]"
            >
              Try the demo
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-0 bg-gradient-to-br from-brand-900 via-brand-950 to-black" />
        <div className="absolute -top-32 left-1/2 -z-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:pb-28 lg:pl-4 lg:pr-8 lg:pt-24 xl:pl-2">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.35fr] lg:gap-12">
            <div className="text-left">
              <h1 className="text-5xl font-bold tracking-tight leading-[1.05] sm:text-6xl lg:text-[4.75rem]">
                Recruit. Sign.{' '}
                <span className="bg-gradient-to-r from-brand-300 to-emerald-300 bg-clip-text text-transparent">
                  Run brand deals.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-brand-200">
                One CRM built for sports agencies.
              </p>

              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/api/demo"
                  className="rounded-full bg-white px-7 py-3 text-base font-semibold text-brand-900 shadow-lg shadow-brand-500/20 transition-transform hover:scale-[1.02]"
                >
                  Try the demo — no signup
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-white/20 px-7 py-3 text-base font-medium text-white transition-colors hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>

              {SHOW_DEMO_CREDENTIALS && (
                <div className="mt-4 inline-flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs text-brand-300 sm:flex-row sm:gap-3 sm:text-sm">
                  <span className="font-medium text-white/80">Manual sign in:</span>
                  <code className="font-mono text-brand-200">{DEMO_USER_EMAIL}</code>
                  <span className="hidden text-white/30 sm:inline">/</span>
                  <code className="font-mono text-brand-200">{DEMO_PASSWORD_HINT}</code>
                </div>
              )}
            </div>

            <div className="relative lg:-mr-8 xl:-mr-16">
              <HeroDashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Audience strip */}
      <section className="border-y border-white/5 bg-brand-950/80">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-brand-300">
            Built for full-service NIL & sports agencies
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-white/70">
            <span>Football</span>
            <span className="text-white/20">•</span>
            <span>Basketball</span>
            <span className="text-white/20">•</span>
            <span>Track & Field</span>
            <span className="text-white/20">•</span>
            <span>Wrestling</span>
            <span className="text-white/20">•</span>
            <span>Multi-sport</span>
          </div>
        </div>
      </section>

      {/* Features — bento layout */}
      <section className="bg-brand-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything a sports agency runs on.
            </h2>
            <p className="mt-4 text-lg text-brand-200">
              Recruiting, communication, deals, contracts, and revenue — one tool, one source of truth.
            </p>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Big card 1 — pipeline */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.05] md:col-span-2 md:row-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-400">
                <span className="h-1 w-1 rounded-full bg-brand-400" />
                Recruiting
              </div>
              <h3 className="mt-3 text-2xl font-semibold">Pipeline that hands itself off.</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-200">
                Kanban from prospect to signed. When a scout marks &quot;interested,&quot; it auto-hands off to the right agent. When the athlete signs, marketing takes over.
              </p>
              <div className="mt-6">
                <PipelineMockup />
              </div>
            </div>

            {/* Big card 2 — communications */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.05] md:col-span-2 md:row-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                Communications
              </div>
              <h3 className="mt-3 text-2xl font-semibold">Gmail, built in.</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-200">
                Send from your Gmail inside the CRM. Every email auto-logs to the athlete. Templates, follow-up reminders, threaded view per athlete.
              </p>
              <div className="mt-6">
                <InboxMockup />
              </div>
            </div>

            {/* Small cards */}
            <BentoCard
              eyebrow="Athletes"
              title="One profile per athlete"
              body="Sport, school, region, deal history, comms, documents — every record lives in one place."
              icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
            <BentoCard
              eyebrow="Brand deals"
              title="Track every dollar"
              body="Outreach, deal stages, contract status, agency fees. Monthly and lifetime revenue."
              icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <BentoCard
              eyebrow="Tasks"
              title="Work the work"
              body="Assign tasks to athletes. @mention teammates. Activity feed shows what changed."
              icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
            <BentoCard
              eyebrow="Import"
              title="Bulk upload by region"
              body="Excel with multi-sheet support, smart column mapping, auto-region creation."
              icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-t border-white/5 bg-gradient-to-b from-brand-950 to-black">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How agencies use it.
            </h2>
            <p className="mt-4 text-lg text-brand-200">
              The full lifecycle, automated where it matters.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map(step => (
              <div
                key={step.step}
                className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <p className="text-xs font-bold tracking-[0.2em] text-brand-400">{step.step}</p>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-200">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Handoff workflow */}
      <section className="border-t border-white/5 bg-brand-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              The handoff that makes it click.
            </h2>
            <p className="mt-4 text-lg text-brand-200">
              Most CRMs leave you to chase the next step. AthleteDesk passes the athlete to the right person the moment status changes.
            </p>
          </div>

          <div className="relative mt-16">
            {/* Connector lines (desktop only) */}
            <div className="pointer-events-none absolute left-0 right-0 top-[110px] -z-0 hidden lg:block">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-[12%]">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-500/40 to-brand-500/40" />
                <div className="h-px flex-1 bg-gradient-to-r from-brand-500/40 via-emerald-500/40 to-transparent" />
              </div>
            </div>

            <div className="relative grid gap-4 sm:gap-6 lg:grid-cols-3">
              {/* Scout */}
              <HandoffCard
                role="Scout"
                accent="border-blue-400/30 bg-blue-500/5"
                badgeTone="bg-blue-500/15 text-blue-300"
                description="Finds prospects and works the top of the funnel."
                bullets={[
                  'Imports prospect lists by region',
                  'Logs every call, email, text',
                  'Moves athletes through outreach stages',
                ]}
                triggerLabel="When marked “Interested” →"
              />

              {/* Agent */}
              <HandoffCard
                role="Agent"
                accent="border-yellow-400/30 bg-yellow-500/5"
                badgeTone="bg-yellow-500/15 text-yellow-300"
                description="Closes the deal and manages the relationship."
                bullets={[
                  'Picks up the athlete automatically',
                  'Handles negotiation + paperwork',
                  'Marks pipeline stage as “Signed”',
                ]}
                triggerLabel="When athlete signs →"
              />

              {/* Marketing */}
              <HandoffCard
                role="Marketing"
                accent="border-green-400/30 bg-green-500/5"
                badgeTone="bg-green-500/15 text-green-300"
                description="Runs brand deals and post-signing operations."
                bullets={[
                  'Owns brand outreach + deal tracking',
                  'Manages roster activity',
                  'Logs revenue against the athlete',
                ]}
              />
            </div>
          </div>

          <p className="mx-auto mt-12 max-w-xl text-center text-sm text-brand-300">
            Auto handoff at every stage. No dropped athletes. No spreadsheet handoffs. No &ldquo;wait, who&rsquo;s on this one?&rdquo;
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 bg-black">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Questions, answered.
          </h2>

          <dl className="mt-12 space-y-4">
            {faqs.map(faq => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors open:bg-white/[0.05]"
              >
                <summary className="flex cursor-pointer items-center justify-between text-base font-medium text-white">
                  {faq.q}
                  <svg
                    className="h-5 w-5 text-brand-400 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <dd className="mt-3 text-sm leading-relaxed text-brand-200">{faq.a}</dd>
              </details>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-brand-900 to-brand-950">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See it in action.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-200">
            Skip the sales call. Click into a working CRM loaded with realistic data and explore.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/api/demo"
              className="rounded-full bg-white px-7 py-3 text-base font-semibold text-brand-900 shadow-lg shadow-brand-500/20 transition-transform hover:scale-[1.02]"
            >
              Try the demo
            </Link>
            <Link
              href={buildDemoAccessMailto()}
              className="rounded-full border border-white/20 px-7 py-3 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              Request access
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-white/50 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-white/10">
              <span className="text-[10px] font-bold text-white">AD</span>
            </div>
            <span>© AthleteDesk</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/api/demo" className="transition-colors hover:text-white">Demo</Link>
            <Link href="/login" className="transition-colors hover:text-white">Sign in</Link>
            <Link href={buildDemoAccessMailto('AthleteDesk - Contact')} className="transition-colors hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
