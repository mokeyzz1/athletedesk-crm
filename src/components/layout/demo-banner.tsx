import Link from 'next/link'
import { buildDemoAccessMailto } from '@/lib/demo'

export function DemoBanner() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:flex-row sm:text-sm">
      <span className="font-medium">
        You&apos;re exploring AthleteDesk in demo mode.
      </span>
      <Link
        href={buildDemoAccessMailto('Interested in AthleteDesk')}
        className="rounded-full border border-amber-300 bg-white px-3 py-0.5 font-semibold text-amber-900 transition-colors hover:bg-amber-100"
      >
        Request a real account →
      </Link>
    </div>
  )
}
