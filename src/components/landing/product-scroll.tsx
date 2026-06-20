/* Horizontal-scroll product showcase — panels move sideways as you scroll down.
   The pin + horizontal tween are driven from the landing page's GSAP context
   (.hscroll-wrap = pinned, .hscroll-track = translated). Panel elements reveal
   via .hp-rise (animated against the horizontal containerAnimation). */

import type { ReactNode } from 'react'
import RevenueChart from './revenue-chart'

function Pill({ children, tone = 'bg-sky-50 text-sky-700' }: { children: ReactNode; tone?: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{children}</span>
}

function PipelineVisual() {
  const cols = [
    { stage: 'Contacted', dot: 'bg-sky-500', names: ['Jordan Cross', 'Tyler Ross', 'Mina Patel'] },
    { stage: 'Interested', dot: 'bg-amber-500', names: ['Maya Brooks', 'Devon Hayes'] },
    { stage: 'Signed', dot: 'bg-emerald-500', names: ['Ari Collins'] },
  ]
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {cols.map(c => (
        <div key={c.stage} className="hp-rise rounded-lg bg-[#f4f5f7] p-2">
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <span className={`h-2 w-2 rounded-full ${c.dot}`} />
            <span className="text-[11px] font-bold text-slate-700">{c.stage}</span>
          </div>
          <div className="space-y-2">
            {c.names.map(n => (
              <div key={n} className="rounded-md border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-700 shadow-sm">{n}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function InboxVisual() {
  const threads = [
    { i: 'CP', from: 'Coach Patterson', sub: 'Re: Visit weekend', unread: true },
    { i: 'SK', from: 'Sarah Kim', sub: 'Updated 400m times', unread: true },
    { i: 'ML', from: 'Marcus Lee', sub: 'NIL paperwork question', unread: false },
    { i: 'JC', from: 'Jordan Cruz', sub: 'Re: Apparel deal', unread: false },
  ]
  return (
    <div className="space-y-2">
      {threads.map(t => (
        <div key={t.from} className={`hp-rise flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 ${t.unread ? 'bg-sky-50/60' : 'bg-white'}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-700">{t.i}</div>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-[12px] ${t.unread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>{t.from}</p>
            <p className="truncate text-[11px] text-slate-400">{t.sub}</p>
          </div>
          {t.unread && <span className="h-2 w-2 rounded-full bg-sky-500" />}
        </div>
      ))}
    </div>
  )
}

function RevenueVisual() {
  return (
    <div>
      <div className="hp-rise flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">This quarter</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900">$168,500</p>
        </div>
        <Pill tone="bg-emerald-50 text-emerald-700">▲ 24%</Pill>
      </div>
      <div className="hp-rise mt-4">
        <RevenueChart />
      </div>
      <div className="mt-3 space-y-2">
        {[['Fanatics', '$15,000', 'Paid'], ['Beats by Dre', '$22,000', 'Invoiced']].map(([b, v, s]) => (
          <div key={b} className="hp-rise flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px]">
            <span className="font-bold text-slate-700">{b}</span>
            <span className="flex items-center gap-2"><span className="font-semibold text-slate-500">{v}</span><Pill tone="bg-emerald-50 text-emerald-700">{s}</Pill></span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TasksVisual() {
  const tasks = [
    { t: 'Prep Darius Washington meeting', done: true },
    { t: 'Send updated NIL paperwork', done: true },
    { t: 'Review brand shortlist — Marcus Lee', done: false },
    { t: 'Follow up: DeShawn Williams', done: false },
  ]
  return (
    <div className="space-y-2.5">
      {tasks.map(t => (
        <div key={t.t} className="hp-rise flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
          <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md ${t.done ? 'bg-sky-500 text-white' : 'border-2 border-slate-300'}`}>
            {t.done && (
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none"><path d="M4.5 10.5l3 3 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </span>
          <span className={`text-[12px] font-medium ${t.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.t}</span>
        </div>
      ))}
    </div>
  )
}

const panels = [
  { eyebrow: 'Recruiting', title: 'A board that moves itself.', body: 'Drag prospects from contacted to signed. Handoffs fire automatically.', Visual: PipelineVisual },
  { eyebrow: 'Communication', title: 'Gmail, on the athlete.', body: 'Every email sent and received, tied to the record. Nothing lost in inboxes.', Visual: InboxVisual },
  { eyebrow: 'Revenue', title: 'Every dollar, tracked.', body: 'Brand deals, contracts, fees, payments — from first pitch to final payout.', Visual: RevenueVisual },
  { eyebrow: 'Tasks', title: 'Nothing slips.', body: 'Assign work, @mention the team, and see exactly what got done.', Visual: TasksVisual },
]

export default function ProductScroll() {
  return (
    <section id="product" className="hscroll-wrap relative flex h-screen flex-col overflow-hidden bg-[#0c0c10] text-white">
      {/* soft blend from the light section above */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24 bg-gradient-to-b from-[#f4f4f1] to-transparent" />

      {/* section title — content sits right under it */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-[15vh] sm:px-6 lg:px-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-sky-400">
          <span className="h-2 w-2 bg-sky-400" /> Product
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold uppercase leading-[1] tracking-tight sm:text-4xl">
          Designed around the agency work that happens every morning.
        </h2>
      </div>

      <div className="hscroll-track flex flex-1 items-center gap-[8vw] pl-[9vw] pr-[9vw] will-change-transform">
        {panels.map(panel => (
          <article key={panel.title} className="hpanel flex h-[72vh] max-h-[640px] w-[80vw] max-w-[1040px] flex-shrink-0 items-center">
            <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="hp-text">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-400">{panel.eyebrow}</p>
                <h3 className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">{panel.title}</h3>
                <p className="mt-5 max-w-md text-lg leading-7 text-neutral-400">{panel.body}</p>
              </div>
              <div className="hp-visual rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
                <panel.Visual />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* progress dots */}
      <div className="pointer-events-none absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5">
        {panels.map((p, i) => (
          <span key={p.title} data-dot={i} className="hp-dot h-2 w-2 rounded-full bg-white/25 transition-all duration-300" />
        ))}
      </div>
    </section>
  )
}
