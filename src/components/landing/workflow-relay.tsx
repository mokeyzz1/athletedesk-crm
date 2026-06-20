/* Animated handoff relay (Scout → Agent → Marketing → Admin).
   One athlete record travels between avatar stations as you scroll; the rail line
   draws itself, each station lights up, and the record's status updates at every
   handoff. Driven from the landing page's GSAP context:
   .relay-wrap, .relay-line-fg, .relay-station[data-i], .relay-record,
   .relay-record-status. */

function Avatar() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.42 0-8 2.6-8 5.8 0 .66.54 1.2 1.2 1.2h13.6c.66 0 1.2-.54 1.2-1.2 0-3.2-3.58-5.8-8-5.8z" />
    </svg>
  )
}

const stations = [
  { role: 'Scout', title: 'Finds the athlete', detail: 'Imports regional lists, logs outreach, and qualifies prospects.' },
  { role: 'Agent', title: 'Owns the relationship', detail: 'Gets the handoff with notes, email history, and tasks attached.' },
  { role: 'Marketing', title: 'Builds the deal flow', detail: 'Runs brand outreach and keeps contract stages connected.' },
  { role: 'Admin', title: 'Sees the business', detail: 'Reviews revenue, productivity, and pipeline health — no chasing.' },
]

export default function WorkflowRelay() {
  return (
    <div className="relay-wrap relative mt-16">
      {/* ============ DESKTOP: horizontal relay ============ */}
      <div className="hidden lg:block">
        {/* role labels — sit on TOP of each avatar */}
        <div className="grid grid-cols-4">
          {stations.map((s, i) => (
            <div key={s.role} className="flex justify-center">
              <span
                data-label={i}
                className="relay-label rounded-full border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 transition-all duration-300"
              >
                {s.role}
              </span>
            </div>
          ))}
        </div>

        {/* avatar rail + connector line + traveling record */}
        <div className="relative mt-5 grid grid-cols-4">
          {/* track */}
          <div className="absolute left-[12.5%] right-[12.5%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/10" />
          {/* drawn progress line */}
          <div className="relay-line-fg absolute left-[12.5%] top-1/2 h-[3px] w-[75%] -translate-y-1/2 origin-left scale-x-0 rounded-full bg-gradient-to-r from-brand-400 to-brand-500" />

          {stations.map((s, i) => (
            <div key={s.role} className="relative z-10 flex justify-center">
              <div
                data-i={i}
                className="relay-station flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-neutral-900 text-neutral-500 shadow-[0_0_0_6px_rgba(10,10,12,1)] transition-all duration-300"
              >
                <Avatar />
              </div>
            </div>
          ))}

          {/* traveling athlete record */}
          <div
            className="relay-record pointer-events-none absolute bottom-[calc(50%+3.25rem)] left-[12.5%] z-20 w-44 -translate-x-1/2"
            style={{ left: '12.5%' }}
          >
            <div className="rounded-xl border border-white/10 bg-white p-3 text-slate-900 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">JC</div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold leading-tight text-slate-900">Jordan Cross</p>
                  <p className="text-[10px] font-medium text-slate-400">WR · Athlete record</p>
                </div>
              </div>
              <span className="relay-record-status mt-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                New prospect
              </span>
            </div>
            {/* pointer */}
            <div className="mx-auto h-3 w-3 -translate-y-1.5 rotate-45 border-b border-r border-white/10 bg-white" />
          </div>
        </div>

        {/* titles + details under each station */}
        <div className="mt-7 grid grid-cols-4 gap-4">
          {stations.map((s, i) => (
            <div key={s.role} data-text={i} className="relay-text px-2 text-center transition-opacity duration-300">
              <h3 className="text-lg font-bold tracking-tight text-white">{s.title}</h3>
              <p className="mx-auto mt-1.5 max-w-[200px] text-[13px] leading-5 text-neutral-400">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============ MOBILE: vertical relay ============ */}
      <div className="relative lg:hidden">
        <div className="absolute left-[39px] top-10 bottom-10 w-[3px] rounded-full bg-white/10" />
        <div className="relay-line-fg-v absolute left-[39px] top-10 w-[3px] origin-top scale-y-0 rounded-full bg-gradient-to-b from-brand-400 to-brand-500" style={{ height: 'calc(100% - 5rem)' }} />
        <div className="space-y-6">
          {stations.map((s, i) => (
            <div key={s.role} className="relative flex items-start gap-5">
              <div
                data-i={i}
                className="relay-station-v relative z-10 flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-neutral-900 text-neutral-500 shadow-[0_0_0_6px_rgba(10,10,12,1)] transition-all duration-300"
              >
                <Avatar />
              </div>
              <div className="pt-3">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">{s.role}</span>
                <h3 className="mt-1 text-xl font-bold tracking-tight text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-neutral-400">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
