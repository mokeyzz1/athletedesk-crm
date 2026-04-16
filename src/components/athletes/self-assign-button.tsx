'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { selfAssignAthlete } from '@/lib/actions/athletes'

interface SelfAssignButtonProps {
  athleteId: string
  roleLabel: string
  assignmentRole: 'scout' | 'agent' | 'marketing'
}

export function SelfAssignButton({ athleteId, roleLabel, assignmentRole }: SelfAssignButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      const result = await selfAssignAthlete(athleteId, assignmentRole)

      if (!result.success) {
        setError(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="btn-secondary text-xs py-1 px-2"
      >
        {isPending ? 'Assigning...' : `Assign me as ${roleLabel}`}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
