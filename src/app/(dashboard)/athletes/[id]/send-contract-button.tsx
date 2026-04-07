'use client'

import { useState } from 'react'
import { SendContractModal } from '@/components/contracts/send-contract-modal'
import { useRouter } from 'next/navigation'

interface SendContractButtonProps {
  athleteId: string
  athleteName: string
  athleteEmail?: string | null
}

export function SendContractButton({ athleteId, athleteName, athleteEmail }: SendContractButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-secondary w-full justify-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Send Contract
      </button>

      {showModal && (
        <SendContractModal
          athleteId={athleteId}
          athleteName={athleteName}
          athleteEmail={athleteEmail || undefined}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            router.refresh()
          }}
        />
      )}
    </>
  )
}
