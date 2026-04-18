import { NextResponse } from 'next/server'
import { logActivityEvent, type ActivityEventType } from '@/lib/actions/activity'
import type { Json } from '@/lib/database.types'

interface ActivityEventRequest {
  entityType?: string
  entityId?: string
  eventType?: ActivityEventType
  title?: string
  metadata?: Json
}

export async function POST(request: Request) {
  const body = await request.json() as ActivityEventRequest

  if (!body.entityType || !body.entityId || !body.eventType || !body.title) {
    return NextResponse.json({ error: 'Missing required activity event fields' }, { status: 400 })
  }

  const result = await logActivityEvent({
    entityType: body.entityType,
    entityId: body.entityId,
    eventType: body.eventType,
    title: body.title,
    metadata: body.metadata ?? {},
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to log activity event' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
