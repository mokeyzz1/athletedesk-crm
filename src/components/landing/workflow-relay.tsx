/* Animated handoff relay (Scout → Agent → Marketing → Admin).
   One athlete record travels between avatar stations as you scroll; connector
   segments draw themselves between (never through) the avatars, each station
   wakes up in color, and the record's status updates at every handoff.
   Avatars are custom transparent WebP portraits in public/avatars/. Driven from
   the landing page's GSAP context:
   .relay-wrap, .relay-seg-fg[data-i], .relay-line-fg-v, .relay-station[data-i],
   .relay-station-v[data-i], .relay-avatar, .relay-record, .relay-card,
   .relay-record-status, .relay-label, .relay-text. */

import React from 'react'

const stations = [
  { role: 'Scout', img: '/avatars/scout.webp', imageClass: 'scale-[1.1]', title: 'Finds the athlete', detail: 'Imports regional lists, logs outreach, and qualifies prospects.' },
  { role: 'Agent', img: '/avatars/agent.webp', imageClass: 'scale-[1.1]', title: 'Owns the relationship', detail: 'Gets the handoff with notes, email history, and tasks attached.' },
  { role: 'Marketing', img: '/avatars/marketing-woman.webp', imageClass: 'translate-y-1 scale-[1.28]', title: 'Builds the deal flow', detail: 'Runs brand outreach and keeps contract stages connected.' },
  { role: 'Admin', img: '/avatars/admin-new.webp', imageClass: 'translate-y-1 scale-[1.22]', title: 'Sees the business', detail: 'Reviews revenue, productivity, and pipeline health — no chasing.' },
]

function StationAvatar({ s, station }: { s: (typeof stations)[number]; station: 'relay-station' | 'relay-station-v' }) {
  return (
    <div
      data-i={stations.indexOf(s)}
      className={`${station} relative z-10 flex h-20 w-20 flex-shrink-0 items-end justify-center overflow-hidden rounded-full border-2 border-white/15 bg-[#d9d8d3] shadow-[0_10px_28px_-8px_rgba(0,0,0,0.7)] transition-all duration-300`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="relay-avatar h-full w-full">
        <img src={s.img} alt="" aria-hidden="true" className={`h-full w-full object-contain ${s.imageClass}`} />
      </div>
    </div>
  )
}

export default function WorkflowRelay() {
  return (
    <div className="relay-wrap relative mt-16 lg:mt-28">
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

        {/* avatar rail + connector segments + traveling record */}
        <div className="relative mt-5 grid grid-cols-4">
          {/* connector segments — stop short of each avatar, never through it.
              absolute children of the grid = no grid cells taken */}
          {[0, 1, 2].map(i => (
            <React.Fragment key={`seg-${i}`}>
              {/* track */}
              <div
                className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/10"
                style={{ left: `calc(12.5% + ${i * 25}% + 54px)`, width: 'calc(25% - 108px)' }}
              />
              {/* drawn progress segment */}
              <div
                data-i={i}
                className="relay-seg-fg absolute top-1/2 h-[3px] origin-left -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-400 to-brand-500 shadow-[0_0_12px_rgba(56,189,248,0.55)]"
                style={{ left: `calc(12.5% + ${i * 25}% + 54px)`, width: 'calc(25% - 108px)' }}
              />
            </React.Fragment>
          ))}

          {stations.map(s => (
            <div key={s.role} className="relative z-10 flex justify-center">
              <StationAvatar s={s} station="relay-station" />
            </div>
          ))}

          {/* traveling athlete record */}
          <div
            className="relay-record pointer-events-none absolute bottom-[calc(50%+5.5rem)] left-[12.5%] z-20 w-44 -translate-x-1/2"
            style={{ left: '12.5%' }}
          >
            <div className="relay-card rounded-xl border border-white/10 bg-white p-3 text-slate-900 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)]">
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
          {stations.map(s => (
            <div key={s.role} className="relative flex items-start gap-5">
              <StationAvatar s={s} station="relay-station-v" />
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
