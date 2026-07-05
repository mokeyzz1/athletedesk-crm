'use client'

import { DEMO_PASSWORD_HINT, DEMO_USER_EMAIL, SHOW_DEMO_CREDENTIALS } from '@/lib/demo'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    if (errorParam) setError(errorParam)
    if (messageParam) setMessage(messageParam)
  }, [searchParams])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    const hint = searchParams.get('hint')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          ...(hint ? { login_hint: hint } : { prompt: 'select_account' }),
          access_type: 'offline',
        },
        scopes: 'https://www.googleapis.com/auth/gmail.send',
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    if (data.user) {
      router.push('/auth/callback')
    }
  }

  const prefillDemo = () => {
    setEmail(DEMO_USER_EMAIL)
    setPassword(DEMO_PASSWORD_HINT)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="mx-auto w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-3 ring-1 ring-gray-200 shadow-sm">
              <Image src="/brand/athletedesk-logo-transparent.png" alt="AthleteDesk" width={78} height={36} className="h-6 w-auto" />
            </div>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">
            Sign in to AthleteDesk
          </h2>
        </div>

        {/* Demo callout */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-900">Just exploring?</p>
              <p className="mt-0.5 text-xs text-brand-700">
                Open a live workspace with seeded athletes, tasks, pipeline activity, and inbox history.
              </p>
            </div>
            <Link
              href="/api/demo"
              className="flex-shrink-0 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Instant demo →
            </Link>
          </div>
          {SHOW_DEMO_CREDENTIALS ? (
            <button
              type="button"
              onClick={prefillDemo}
              className="mt-3 flex w-full items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-left text-xs text-brand-800 transition-colors hover:bg-white"
            >
              <span>
                Manual sign in:{' '}
                <code className="font-mono">{DEMO_USER_EMAIL}</code>
                <span className="text-brand-500"> / </span>
                <code className="font-mono">{DEMO_PASSWORD_HINT}</code>
              </span>
              <span className="font-medium">Fill</span>
            </button>
          ) : (
            <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-brand-800">
              Prefer not to use a shared password? Use <span className="font-semibold">Instant demo</span> and we&apos;ll handle the sign-in for you.
            </p>
          )}
        </div>

        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isLoading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-gray-50 px-3 font-medium text-gray-400 uppercase tracking-wider">or with email</span>
          </div>
        </div>

        {/* Email/password */}
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500"
            placeholder="Email"
          />
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500"
            placeholder="Password"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-3 ring-1 ring-gray-200 shadow-sm animate-pulse">
            <Image src="/brand/athletedesk-logo-transparent.png" alt="AthleteDesk" width={78} height={36} className="h-6 w-auto" />
          </div>
          <p className="text-gray-500">Loading…</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
