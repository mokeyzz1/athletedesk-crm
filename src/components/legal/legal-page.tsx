import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DEMO_CONTACT_EMAIL } from '@/lib/demo'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

interface LegalPageProps {
  title: string
  updated: string
  /** Plain-English summary shown above the full text */
  summary: string[]
  sections: LegalSection[]
  current: 'privacy' | 'terms'
}

export const legalLink = 'font-semibold text-brand-600 underline-offset-2 hover:underline'

/** Shared layout for the Privacy Policy and Terms of Service pages */
export function LegalPage({ title, updated, summary, sections, current }: LegalPageProps) {
  const other = current === 'privacy'
    ? { href: '/terms', label: 'Terms of Service' }
    : { href: '/privacy', label: 'Privacy Policy' }

  return (
    <div className="min-h-screen bg-[#f6f6f3] text-neutral-900">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Go to AthleteDesk home" className="flex items-center gap-2.5">
            <span className="relative h-8 w-11 overflow-hidden">
              <Image src="/brand/athletedesk-logo-transparent.png" alt="" fill sizes="44px" className="object-contain object-center" priority />
            </span>
            <span className="text-sm font-bold uppercase tracking-tight">AthleteDesk</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-neutral-600">
            <Link href={other.href} className="hover:text-neutral-900">{other.label}</Link>
            <Link href="/" className="text-brand-600 hover:text-brand-500">Home</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 lg:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Legal</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-neutral-500">Last updated {updated}</p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">On this page</p>
              <ol className="mt-3 space-y-2 border-l border-neutral-200 text-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-4 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900">
                      {i + 1}. {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="min-w-0 max-w-3xl">
            <section aria-label="Summary" className="rounded-xl border border-neutral-200 bg-white p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">The short version</h2>
              <ul className="mt-4 space-y-3 text-[15px] leading-6 text-neutral-700">
                {summary.map(point => (
                  <li key={point} className="flex gap-3">
                    <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-neutral-500">This summary is for convenience. The full text below is what applies.</p>
            </section>

            <div className="mt-12 space-y-12 text-[15px] leading-7 text-neutral-700">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-8">
                  <h2 className="flex items-baseline gap-3 text-xl font-bold text-neutral-900">
                    <span className="text-sm font-semibold tabular-nums text-neutral-400">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </h2>
                  <div className="mt-3 space-y-3 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{s.body}</div>
                </section>
              ))}
            </div>

            <div className="mt-16 flex flex-col gap-4 rounded-xl bg-neutral-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Questions about this page?</p>
                <p className="mt-1 text-sm text-neutral-400">Email us and a real person will get back to you.</p>
              </div>
              <a href={`mailto:${DEMO_CONTACT_EMAIL}`} className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100">
                {DEMO_CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} AthleteDesk</p>
          <div className="flex gap-5">
            <Link href="/privacy" className={current === 'privacy' ? 'text-neutral-900' : 'hover:text-neutral-900'}>Privacy</Link>
            <Link href="/terms" className={current === 'terms' ? 'text-neutral-900' : 'hover:text-neutral-900'}>Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
