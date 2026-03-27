'use client'

import { useAthletePanel } from '@/contexts/athlete-panel-context'

interface EditAthleteButtonProps {
  athleteId: string
  className?: string
}

export function EditAthleteButton({ athleteId, className = 'btn-secondary' }: EditAthleteButtonProps) {
  const { openAthletePanel } = useAthletePanel()

  return (
    <button
      onClick={() => openAthletePanel(athleteId)}
      className={className}
    >
      Edit Athlete
    </button>
  )
}
