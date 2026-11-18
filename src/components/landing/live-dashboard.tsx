/* A coded, animated dashboard for the landing takeover — universal sports-agency
   view (no client-specific regions). Animations are driven from the landing page's
   GSAP context via these classes:
   .ld-num  (count-up, data-target / data-prefix)
   .ld-card (staggered entrance) */

const sidebarGroups: { label?: string; items: { name: string; active?: boolean }[] }[] = [
  { items: [{ name: 'Dashboard', active: true }] },
  { label: 'Athletes', items: [{ name: 'All Athletes' }, { name: 'Recruiting' }, { name: 'Roster' }, { name: 'Contracts' }] },
  { label: 'Revenue', items: [{ name: 'Brand Outreach' }, { name: 'Financials' }] },
  { label: 'Team', items: [{ name: 'Email' }, { name: 'Communications' }, { name: 'Tasks' }, { name: 'Productivity' }, { name: 'Analytics' }] },
]

const stats = [
  { label: 'Total Athletes', target: 548, prefix: '' },
  { label: 'Signed Clients', target: 30, prefix: '' },
  { label: 'In Pipeline', target: 120, prefix: '' },
  { label: 'Active Brand Talks', target: 16, prefix: '' },
]

const pipeline: { stage: string; count: number; dot: string; athletes: { name: string; meta: string; initials: string }[] }[] = [
  {
    stage: 'Contacted',
    count: 43,
    dot: 'bg-sky-500',
    athletes: [
      { name: 'Jordan Cross', meta: 'Football · 2026', initials: 'JC' },
      { name: 'Tyler Ross', meta: 'Track · 2025', initials: 'TR' },
      { name: 'Mina Patel', meta: 'Basketball · 2026', initials: 'MP' },
    ],
  },
  {
    stage: 'Interested',
    count: 19,
    dot: 'bg-amber-500',
    athletes: [
      { name: 'Maya Brooks', meta: 'Track · 2025', initials: 'MB' },
      { name: 'Devon Hayes', meta: 'Wrestling · 2026', initials: 'DH' },
    ],
  },
  {
    stage: 'Signed',
    count: 30,
    dot: 'bg-emerald-500',
    athletes: [
      { name: 'Ari Collins', meta: 'Basketball · 2025', initials: 'AC' },
      { name: 'Marcus Lee', meta: 'Football · 2025', initials: 'ML' },
    ],
  },
]

const revenue = [
  { label: 'Total Revenue', target: 168500, prefix: '$', sub: 'Lifetime agency revenue' },
  { label: 'Pending Revenue', target: 57000, prefix: '$', sub: 'Awaiting payment' },
  { label: 'This Month', target: 24300, prefix: '$', sub: '3 deals closed' },
]

const tasks = [
  { title: 'Prep Darius Washington meeting', who: 'Darius Washington', tag: 'Today' },
  { title: 'Send updated NIL paperwork', who: 'Maya Brooks', tag: 'Today' },
  { title: 'Review brand shortlist', who: 'Marcus Lee', tag: 'Tomorrow' },
]

const followups = [
  { name: 'DeShawn Williams', note: 'Intro text after Instagram reply', due: 'Due today' },
  { name: 'Darius Washington', note: 'Revenue-share strategy call', due: 'Due today' },
  { name: 'Terrance Mitchell', note: 'Brand shortlist follow-up', due: 'Tomorrow' },
]

const deals = [
  { brand: 'Fanatics', who: 'DeShawn Williams', value: '$15,000', status: 'Interested', tone: 'bg-emerald-50 text-emerald-700' },
  { brand: 'Beats by Dre', who: 'Terrance Mitchell', value: '$22,000', status: 'Interested', tone: 'bg-emerald-50 text-emerald-700' },
  { brand: 'Nike', who: 'Darius Washington', value: '$45,000', status: 'In Discussion', tone: 'bg-sky-50 text-sky-700' },
]

function NavDot() {
  return <span className="h-4 w-4 flex-shrink-0 rounded bg-white/15" />
}

export default function LiveDashboard() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#f4f5f7] text-left text-slate-900">
      {/* sidebar */}
      <aside className="hidden w-[210px] flex-shrink-0 flex-col bg-[#0c2440] px-3 py-4 text-[13px] text-slate-300 md:flex">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-white text-[10px] font-bold text-[#0c2440]">AD</div>
          <span className="text-sm font-bold text-white">AthleteDesk</span>
        </div>
        <div className="mt-5 flex-1 space-y-4 overflow-hidden">
          {sidebarGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300/70">{group.label}</p>}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <div
                    key={item.name}
                    className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 ${item.active ? 'bg-white/10 font-semibold text-white' : 'hover:bg-white/5'}`}
                  >
                    <NavDot />
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-white/10 px-2 pt-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">AB</div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">Ava Brooks</p>
            <p className="truncate text-[10px] text-slate-400">Agency admin</p>
          </div>
        </div>
      </aside>

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-xl">Good afternoon, Ava</h3>
            <p className="text-xs text-slate-500 sm:text-sm">You have 3 follow-ups due today</p>
          </div>
          <div className="flex-shrink-0 rounded-full bg-sky-500 px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm">+ Add Athlete</div>
        </header>

        <div className="flex-1 space-y-3 overflow-hidden p-3 sm:space-y-4 sm:p-5">
          {/* stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map(s => (
              <div key={s.label} className="ld-card rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className="ld-num mt-2 text-3xl font-bold tracking-tight text-slate-900" data-target={s.target} data-prefix={s.prefix}>
                  {s.prefix}0
                </p>
              </div>
            ))}
          </div>

          {/* recruiting pipeline (universal) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Recruiting Pipeline</h4>
              <span className="text-xs font-semibold text-sky-600">View board</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {pipeline.map(col => (
                <div key={col.stage} className="rounded-lg bg-[#f4f5f7] p-2.5">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <span className="text-xs font-bold text-slate-700">{col.stage}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">{col.count}</span>
                  </div>
                  <div className="space-y-2">
                    {col.athletes.map(a => (
                      <div key={a.name} className="ld-card flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                          {a.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-slate-800">{a.name}</p>
                          <p className="truncate text-[10px] text-slate-400">{a.meta}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* revenue */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {revenue.map(r => (
              <div key={r.label} className="ld-card rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{r.label}</p>
                <p className="ld-num mt-1.5 text-2xl font-bold tracking-tight text-slate-900" data-target={r.target} data-prefix={r.prefix}>
                  {r.prefix}0
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">{r.sub}</p>
              </div>
            ))}
          </div>

          {/* bottom row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="ld-card rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">My Tasks</h4>
                <span className="text-[10px] font-semibold text-sky-600">View all</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {tasks.map(t => (
                  <div key={t.title} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-slate-800">{t.title}</p>
                      <p className="text-[10px] text-slate-400">{t.who}</p>
                    </div>
                    <span className="flex-shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700">{t.tag}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ld-card rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">Upcoming Follow-ups</h4>
                <span className="text-[10px] font-semibold text-sky-600">View all</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {followups.map(f => (
                  <div key={f.name} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-slate-800">{f.name}</p>
                      <p className="truncate text-[10px] text-slate-400">{f.note}</p>
                    </div>
                    <span className="flex-shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">{f.due}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ld-card rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">Active Brand Discussions</h4>
                <span className="text-[10px] font-semibold text-sky-600">View all</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {deals.map(d => (
                  <div key={d.brand + d.who} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-slate-800">{d.brand}</p>
                      <p className="truncate text-[10px] text-slate-400">{d.who} · {d.value}</p>
                    </div>
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${d.tone}`}>{d.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
