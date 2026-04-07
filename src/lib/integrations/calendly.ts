import { getAccessToken, getValidIntegration } from './token-refresh'

const CALENDLY_API_BASE = 'https://api.calendly.com'

export interface CalendlyUser {
  uri: string
  name: string
  email: string
  scheduling_url: string
  timezone: string
  avatar_url?: string
  current_organization?: string
}

export interface CalendlyEvent {
  uri: string
  name: string
  status: 'active' | 'canceled'
  start_time: string
  end_time: string
  event_type: string
  location?: {
    type: string
    location?: string
    join_url?: string
  }
  invitees_counter: {
    total: number
    active: number
    limit: number
  }
  created_at: string
  updated_at: string
  event_memberships: Array<{
    user: string
  }>
  event_guests?: Array<{
    email: string
    created_at: string
    updated_at: string
  }>
}

export interface CalendlyInvitee {
  uri: string
  email: string
  name: string
  status: 'active' | 'canceled'
  timezone: string
  event: string
  created_at: string
  updated_at: string
  questions_and_answers?: Array<{
    question: string
    answer: string
  }>
  tracking?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
  }
  cancel_url?: string
  reschedule_url?: string
}

/**
 * Get the current user's Calendly profile
 */
export async function getCurrentUser(
  userId: string
): Promise<{ user?: CalendlyUser; error?: string }> {
  const token = await getAccessToken(userId, 'calendly')
  if (!token) {
    return { error: 'No valid Calendly integration' }
  }

  try {
    const response = await fetch(`${CALENDLY_API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Calendly get user error:', error)
      return { error: 'Failed to fetch user' }
    }

    const data = await response.json()
    return { user: data.resource }
  } catch (error) {
    console.error('Calendly API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * Get the user's scheduling link from stored integration settings
 */
export async function getSchedulingLink(userId: string): Promise<string | null> {
  const integration = await getValidIntegration(userId, 'calendly')
  if (!integration) return null

  // First check stored settings
  const settings = integration.settings as { scheduling_url?: string } | null
  if (settings?.scheduling_url) {
    return settings.scheduling_url
  }

  // Otherwise fetch from API
  const { user } = await getCurrentUser(userId)
  return user?.scheduling_url || null
}

/**
 * List scheduled events for the user
 */
export async function listScheduledEvents(
  userId: string,
  options: {
    minStartTime?: string
    maxStartTime?: string
    count?: number
    status?: 'active' | 'canceled'
  } = {}
): Promise<{ events: CalendlyEvent[]; error?: string }> {
  const token = await getAccessToken(userId, 'calendly')
  if (!token) {
    return { events: [], error: 'No valid Calendly integration' }
  }

  // First get the user to get their URI
  const { user, error: userError } = await getCurrentUser(userId)
  if (userError || !user) {
    return { events: [], error: userError || 'Could not get user' }
  }

  const params = new URLSearchParams({
    user: user.uri,
    count: String(options.count || 20),
    status: options.status || 'active',
    sort: 'start_time:asc',
    ...(options.minStartTime && { min_start_time: options.minStartTime }),
    ...(options.maxStartTime && { max_start_time: options.maxStartTime }),
  })

  try {
    const response = await fetch(
      `${CALENDLY_API_BASE}/scheduled_events?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Calendly list events error:', error)
      return { events: [], error: 'Failed to fetch events' }
    }

    const data = await response.json()
    return { events: data.collection || [] }
  } catch (error) {
    console.error('Calendly API error:', error)
    return { events: [], error: 'API request failed' }
  }
}

/**
 * Get event details by event URI
 */
export async function getEventDetails(
  userId: string,
  eventUri: string
): Promise<{ event?: CalendlyEvent; error?: string }> {
  const token = await getAccessToken(userId, 'calendly')
  if (!token) {
    return { error: 'No valid Calendly integration' }
  }

  try {
    const response = await fetch(eventUri, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Calendly get event error:', error)
      return { error: 'Failed to fetch event' }
    }

    const data = await response.json()
    return { event: data.resource }
  } catch (error) {
    console.error('Calendly API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * Get invitees for an event
 */
export async function getEventInvitees(
  userId: string,
  eventUri: string
): Promise<{ invitees: CalendlyInvitee[]; error?: string }> {
  const token = await getAccessToken(userId, 'calendly')
  if (!token) {
    return { invitees: [], error: 'No valid Calendly integration' }
  }

  // Extract event UUID from URI
  const eventUuid = eventUri.split('/').pop()
  if (!eventUuid) {
    return { invitees: [], error: 'Invalid event URI' }
  }

  try {
    const response = await fetch(
      `${CALENDLY_API_BASE}/scheduled_events/${eventUuid}/invitees`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Calendly get invitees error:', error)
      return { invitees: [], error: 'Failed to fetch invitees' }
    }

    const data = await response.json()
    return { invitees: data.collection || [] }
  } catch (error) {
    console.error('Calendly API error:', error)
    return { invitees: [], error: 'API request failed' }
  }
}

/**
 * Get upcoming events for the next N days
 */
export async function getUpcomingEvents(
  userId: string,
  days: number = 7
): Promise<{ events: CalendlyEvent[]; error?: string }> {
  const now = new Date()
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  return listScheduledEvents(userId, {
    minStartTime: now.toISOString(),
    maxStartTime: future.toISOString(),
    status: 'active',
  })
}
