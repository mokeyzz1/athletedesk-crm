'use client'

import { useState } from 'react'
import { ScheduleMeetingModal } from '@/components/calendar/schedule-meeting-modal'
import { useRouter } from 'next/navigation'

interface ScheduleMeetingButtonProps {
  athleteId: string
  athleteName: string
  athleteEmail?: string | null
}

export function ScheduleMeetingButton({ athleteId, athleteName, athleteEmail }: ScheduleMeetingButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-secondary w-full justify-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Schedule Meeting
      </button>

      {showModal && (
        <ScheduleMeetingModal
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
