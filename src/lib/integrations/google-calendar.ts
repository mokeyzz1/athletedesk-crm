import { getAccessToken, getValidIntegration } from './token-refresh'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

export interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }>
  conferenceData?: {
    createRequest?: {
      requestId: string
      conferenceSolutionKey: { type: string }
    }
    entryPoints?: Array<{
      entryPointType: string
      uri: string
    }>
  }
  htmlLink?: string
  hangoutLink?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
}

export interface ListEventsOptions {
  timeMin?: string
  timeMax?: string
  maxResults?: number
  singleEvents?: boolean
  orderBy?: 'startTime' | 'updated'
  q?: string // Search query
}

/**
 * List events from user's primary Google Calendar
 */
export async function listEvents(
  userId: string,
  options: ListEventsOptions = {}
): Promise<{ events: GoogleCalendarEvent[]; error?: string }> {
  const token = await getAccessToken(userId, 'google_calendar')
  if (!token) {
    return { events: [], error: 'No valid Google Calendar integration' }
  }

  const params = new URLSearchParams({
    singleEvents: String(options.singleEvents ?? true),
    orderBy: options.orderBy || 'startTime',
    maxResults: String(options.maxResults || 50),
    ...(options.timeMin && { timeMin: options.timeMin }),
    ...(options.timeMax && { timeMax: options.timeMax }),
    ...(options.q && { q: options.q }),
  })

  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Calendar list events error:', error)
      return { events: [], error: 'Failed to fetch events' }
    }

    const data = await response.json()
    return { events: data.items || [] }
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return { events: [], error: 'API request failed' }
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(
  userId: string,
  event: Omit<GoogleCalendarEvent, 'id'>
): Promise<{ event?: GoogleCalendarEvent; error?: string }> {
  const token = await getAccessToken(userId, 'google_calendar')
  if (!token) {
    return { error: 'No valid Google Calendar integration' }
  }

  try {
    // Add conference data request for Google Meet
    const eventWithMeet = {
      ...event,
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventWithMeet),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Calendar create event error:', error)
      return { error: 'Failed to create event' }
    }

    const data = await response.json()
    return { event: data }
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  userId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<{ event?: GoogleCalendarEvent; error?: string }> {
  const token = await getAccessToken(userId, 'google_calendar')
  if (!token) {
    return { error: 'No valid Google Calendar integration' }
  }

  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Calendar update event error:', error)
      return { error: 'Failed to update event' }
    }

    const data = await response.json()
    return { event: data }
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(
  userId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken(userId, 'google_calendar')
  if (!token) {
    return { success: false, error: 'No valid Google Calendar integration' }
  }

  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok && response.status !== 204) {
      const error = await response.text()
      console.error('Google Calendar delete event error:', error)
      return { success: false, error: 'Failed to delete event' }
    }

    return { success: true }
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return { success: false, error: 'API request failed' }
  }
}

/**
 * Get a single event by ID
 */
export async function getEvent(
  userId: string,
  eventId: string
): Promise<{ event?: GoogleCalendarEvent; error?: string }> {
  const token = await getAccessToken(userId, 'google_calendar')
  if (!token) {
    return { error: 'No valid Google Calendar integration' }
  }

  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Calendar get event error:', error)
      return { error: 'Failed to fetch event' }
    }

    const data = await response.json()
    return { event: data }
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * Get upcoming events for the next N days
 */
export async function getUpcomingEvents(
  userId: string,
  days: number = 7,
  maxResults: number = 10
): Promise<{ events: GoogleCalendarEvent[]; error?: string }> {
  const now = new Date()
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  return listEvents(userId, {
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })
}
