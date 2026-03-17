'use client'

import { useState } from 'react'
import { EmailComposeModal } from '@/components/email-compose-modal'
import { useRouter } from 'next/navigation'

interface SendEmailButtonProps {
  athleteId: string
  athleteName: string
  athleteEmail: string | null
  schoolName?: string | null
}

export function SendEmailButton({ athleteId, athleteName, athleteEmail, schoolName }: SendEmailButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  if (!athleteEmail) {
    return (
      <button
        disabled
        className="btn-secondary w-full justify-center opacity-50 cursor-not-allowed"
        title="No email address on file"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Send Email
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-primary w-full justify-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Send Email
      </button>

      {showModal && (
        <EmailComposeModal
          athleteId={athleteId}
          athleteName={athleteName}
          athleteEmail={athleteEmail}
          schoolName={schoolName || undefined}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            router.refresh()
          }}
        />
      )}
    </>
  )
}
