import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as googleCalendar from '@/lib/integrations/google-calendar'
import { hasIntegration } from '@/lib/integrations/token-refresh'

// GET - List calendar events
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current user's ID
  const { data: userDataRaw } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const userData = userDataRaw as { id: string } | null

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Check if user has Google Calendar integration
  const hasCalendar = await hasIntegration(userData.id, 'google_calendar')
  if (!hasCalendar) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')
  const maxResults = parseInt(searchParams.get('maxResults') || '20')

  // Fetch events from Google Calendar
  const { events, error } = await googleCalendar.getUpcomingEvents(
    userData.id,
    days,
    maxResults
  )

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ events })
}

// POST - Create a new calendar event
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current user's ID
  const { data: userDataRaw } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const userData = userDataRaw as { id: string } | null

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Check if user has Google Calendar integration
  const hasCalendar = await hasIntegration(userData.id, 'google_calendar')
  if (!hasCalendar) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  const body = await request.json()
  const { summary, description, start, end, attendees, athleteId } = body

  if (!summary || !start || !end) {
    return NextResponse.json(
      { error: 'summary, start, and end are required' },
      { status: 400 }
    )
  }

  // Create event in Google Calendar
  const { event, error } = await googleCalendar.createEvent(userData.id, {
    summary,
    description,
    start: { dateTime: start },
    end: { dateTime: end },
    attendees: attendees?.map((email: string) => ({ email })),
  })

  if (error || !event) {
    return NextResponse.json({ error: error || 'Failed to create event' }, { status: 500 })
  }

  // Optionally store in local database for athlete reference
  if (athleteId) {
    // Get user's organization for the calendar event
    const { data: userOrgRaw } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userData.id)
      .single()

    const userOrg = userOrgRaw as { organization_id: string | null } | null

    await supabase.from('calendar_events').insert({
      organization_id: userOrg?.organization_id,
      user_id: userData.id,
      athlete_id: athleteId,
      external_id: event.id,
      provider: 'google_calendar',
      title: summary,
      description,
      start_time: start,
      end_time: end,
      meeting_url: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
      status: 'confirmed',
    } as never)
  }

  return NextResponse.json({
    event: {
      id: event.id,
      summary: event.summary,
      start: event.start,
      end: event.end,
      htmlLink: event.htmlLink,
      hangoutLink: event.hangoutLink,
    },
  })
}
