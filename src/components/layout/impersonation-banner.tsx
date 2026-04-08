'use client'

import { useRouter } from 'next/navigation'

interface ImpersonationBannerProps {
  organizationName: string
}

export function ImpersonationBanner({ organizationName }: ImpersonationBannerProps) {
  const router = useRouter()

  const stopViewing = async () => {
    const response = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: null }),
    })

    const result = await response.json()

    if (result.success) {
      // Force hard navigation to ensure fresh data
      window.location.href = '/admin'
    }
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span>
          Viewing as <strong>{organizationName}</strong>
        </span>
      </div>
      <button
        onClick={stopViewing}
        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium transition-colors"
      >
        Exit View
      </button>
    </div>
  )
}
