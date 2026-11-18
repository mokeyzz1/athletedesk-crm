/* Animated lifecycle flow (Recruit → Represent → Monetize).
   An athlete token travels the path as you scroll; the line draws itself and each
   stage lights up. Driven from the landing page's GSAP context (MotionPath):
   #lifePath, .life-line-fg, .life-node[data-i], .life-token, .life-label[data-i] */

const PATH = 'M 150 80 C 320 20, 380 140, 500 80 S 700 20, 850 80'

const stages = [
  { x: 150, label: 'Recruit', body: 'Import lists, qualify athletes, move them through status.' },
  { x: 500, label: 'Represent', body: 'Emails, notes, tasks, and ownership tied to the athlete.' },
  { x: 850, label: 'Monetize', body: 'Brand deals, contracts, fees, and payments — all tracked.' },
]

export default function LifecycleFlow() {
  return (
    <div className="life-wrap relative mt-16">
      <svg viewBox="0 0 1000 160" className="w-full overflow-visible" preserveAspectRatio="xMidYMid meet">
        {/* track */}
        <path d={PATH} fill="none" stroke="#d6d3cd" strokeWidth="3" strokeLinecap="round" />
        {/* drawn progress line */}
        <path id="lifePath" className="life-line-fg" d={PATH} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
        {/* nodes */}
        {stages.map((s, i) => (
          <circle key={s.label} className="life-node" data-i={i} cx={s.x} cy="80" r="9" fill="#ffffff" stroke="#d6d3cd" strokeWidth="3" />
        ))}
        {/* traveling token */}
        <g className="life-token" transform="translate(150,80)">
          <circle r="22" fill="#0ea5e9" fillOpacity="0.18" />
          <circle r="13" fill="#0ea5e9" />
          <circle r="13" fill="none" stroke="#ffffff" strokeWidth="2" />
        </g>
      </svg>

      {/* labels under each node */}
      <div className="pointer-events-none absolute inset-0">
        {stages.map((s, i) => (
          <div
            key={s.label}
            className="life-label absolute -translate-x-1/2 text-center transition-opacity"
            data-i={i}
            style={{ left: `${s.x / 10}%`, top: '62%', opacity: 0.4 }}
          >
            <p className="text-lg font-bold uppercase tracking-tight text-neutral-900 sm:text-xl">{s.label}</p>
            <p className="mx-auto mt-1.5 max-w-[180px] text-xs leading-5 text-neutral-500">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
