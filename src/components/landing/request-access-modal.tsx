'use client'

/* "Request access" modal — replaces the mailto flow. Posts to
   /api/access-requests (stored in Supabase, reviewed in /admin). */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { buildDemoAccessMailto, DEMO_CONTACT_EMAIL } from '@/lib/demo'

const ROSTER_SIZES = ['<25', '25-100', '100-500', '500+'] as const

export default function RequestAccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [agency, setAgency] = useState('')
  const [email, setEmail] = useState('')
  const [rosterSize, setRosterSize] = useState<string>('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          agency,
          email,
          rosterSize: rosterSize || undefined,
          message: message || undefined,
          website,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    }
  }

  const inputCls =
    'w-full rounded-lg border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 outline-none transition-colors focus:border-brand-400'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Request access"
            className="w-full max-w-md rounded-t-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl sm:rounded-2xl"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={e => e.stopPropagation()}
          >
            {status === 'success' ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                  <svg className="h-6 w-6" viewBox="0 0 20 20" fill="none"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">Request received</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  Thanks {name.split(' ')[0]} — we&apos;ll reach out at {email} within a day or two.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">Request access</h3>
                    <p className="mt-1 text-sm text-neutral-400">Invite-only for now — tell us about your agency.</p>
                  </div>
                  <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                </div>

                <form onSubmit={submit} className="mt-5 space-y-3.5">
                  <input className={inputCls} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required maxLength={120} />
                  <input className={inputCls} placeholder="Agency name" value={agency} onChange={e => setAgency(e.target.value)} required maxLength={160} />
                  <input className={inputCls} placeholder="Work email" type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={200} />
                  <select
                    className={`${inputCls} ${rosterSize ? '' : 'text-neutral-500'}`}
                    value={rosterSize}
                    onChange={e => setRosterSize(e.target.value)}
                  >
                    <option value="" disabled>Roster size (optional)</option>
                    {ROSTER_SIZES.map(s => <option key={s} value={s} className="bg-neutral-900 text-white">{s} athletes</option>)}
                  </select>
                  <textarea className={`${inputCls} resize-none`} placeholder="Anything else? (optional)" rows={3} value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} />
                  {/* honeypot — hidden from real users */}
                  <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} placeholder="Website" aria-hidden="true" />

                  {status === 'error' && <p className="text-sm font-semibold text-red-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full rounded-full bg-brand-500 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
                  >
                    {status === 'submitting' ? 'Sending…' : 'Request access'}
                  </button>
                  <p className="text-center text-xs text-neutral-500">
                    Prefer email?{' '}
                    <a href={buildDemoAccessMailto('AthleteDesk - Access Request')} className="font-semibold text-neutral-400 hover:text-white">
                      {DEMO_CONTACT_EMAIL}
                    </a>
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
