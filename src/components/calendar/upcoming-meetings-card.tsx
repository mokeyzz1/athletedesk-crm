'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime: string }
  end: { dateTime: string }
  htmlLink?: string
  hangoutLink?: string
}

export function UpcomingMeetingsCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchEvents() {
      try {
        // First check if calendar is connected
        const intRes = await fetch('/api/integrations')
        const intData = await intRes.json()
        const gcalIntegration = intData.integrations?.find(
          (i: { provider: string; is_active: boolean }) =>
            i.provider === 'google_calendar' && i.is_active
        )

        if (!gcalIntegration) {
          setConnected(false)
          setLoading(false)
          return
        }

        setConnected(true)

        // Fetch upcoming events
        const res = await fetch('/api/calendar/events?days=7&maxResults=5')
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch events')
        }

        setEvents(data.events || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Upcoming Meetings</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="bg-white rounded border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Upcoming Meetings</h3>
        </div>
        <div className="text-center py-6">
          <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500 mt-1">Connect Google Calendar</p>
          <Link href="/settings" className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-1 inline-block">
            Go to Settings
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Upcoming Meetings</h3>
        </div>
        <div className="text-center py-6 text-red-500 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Upcoming Meetings</h3>
        <span className="text-xs text-gray-500">Next 7 days</span>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-6">
          <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500 mt-1">No upcoming meetings</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {events.map((event) => (
            <li key={event.id}>
              <div className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-gray-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">{event.summary}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {formatDate(event.start.dateTime)} at {formatTime(event.start.dateTime)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {event.hangoutLink && (
                    <a
                      href={event.hangoutLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      Join
                    </a>
                  )}
                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                      title="Open in Google Calendar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
