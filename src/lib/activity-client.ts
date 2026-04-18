import type { ActivityEventType, Json } from '@/lib/database.types'

interface ClientActivityEventInput {
  entityType: string
  entityId: string
  eventType: ActivityEventType
  title: string
  metadata?: Json
}

export async function logClientActivityEvent(input: ClientActivityEventInput) {
  try {
    const response = await fetch('/api/activity-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      console.error('Failed to log activity event:', await response.text())
    }
  } catch (error) {
    console.error('Failed to log activity event:', error)
  }
}
