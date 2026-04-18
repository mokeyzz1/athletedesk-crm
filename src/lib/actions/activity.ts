'use server'

import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'
import { getAuthContext } from './auth'
import { AuthError } from './errors'

export type ActivityEventType =
  | 'athlete.assigned'
  | 'athlete.unassigned'
  | 'athlete.reassigned'
  | 'athlete.claimed'
  | 'athlete.status_changed'
  | 'athlete.handoff'

export interface LogActivityEventInput {
  entityType: 'athlete' | string
  entityId: string
  eventType: ActivityEventType
  title: string
  metadata?: Json
}

export async function logActivityEvent(input: LogActivityEventInput): Promise<{ success: boolean; error?: string }> {
  return logActivityEvents([input])
}

export async function logActivityEvents(inputs: LogActivityEventInput[]): Promise<{ success: boolean; error?: string }> {
  if (inputs.length === 0) {
    return { success: true }
  }

  try {
    const { organizationId, userId } = await getAuthContext()
    const supabase = await createClient()

    const rows = inputs.map((input) => ({
      organization_id: organizationId,
      actor_id: userId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      event_type: input.eventType,
      title: input.title,
      metadata: input.metadata ?? {},
    }))

    const { error } = await supabase.from('activity_events').insert(rows as never[])
    if (error) {
      console.error('Log activity event error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Log activity event unexpected error:', err)
    return { success: false, error: 'Failed to log activity event' }
  }
}
