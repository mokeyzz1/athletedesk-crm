'use client'

import { useState, useEffect } from 'react'
import { getTomorrowDateString } from '@/lib/helpers'

interface ScheduleMeetingModalProps {
  athleteId: string
  athleteName: string
  athleteEmail?: string
  onClose: () => void
  onSuccess: () => void
}

export function ScheduleMeetingModal({
  athleteId,
  athleteName,
  athleteEmail,
  onClose,
  onSuccess,
}: ScheduleMeetingModalProps) {
  const [title, setTitle] = useState(`Meeting with ${athleteName}`)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [attendeeEmail, setAttendeeEmail] = useState(athleteEmail || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)

  useEffect(() => {
    // Check Google Calendar connection status
    async function checkCalendar() {
      try {
        const res = await fetch('/api/integrations')
        const data = await res.json()
        const gcalIntegration = data.integrations?.find(
          (i: { provider: string; is_active: boolean }) =>
            i.provider === 'google_calendar' && i.is_active
        )
        setCalendarConnected(!!gcalIntegration)
      } catch {
        setCalendarConnected(false)
      }
    }
    checkCalendar()

    // Set default date to tomorrow
    setDate(getTomorrowDateString())
  }, [])

  const handleConnectCalendar = () => {
    window.location.href = '/api/integrations/google-calendar'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !date || !startTime || !endTime) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Create ISO timestamps
      const startDateTime = new Date(`${date}T${startTime}:00`).toISOString()
      const endDateTime = new Date(`${date}T${endTime}:00`).toISOString()

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: title,
          description,
          start: startDateTime,
          end: endDateTime,
          attendees: attendeeEmail ? [attendeeEmail] : [],
          athleteId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create event')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule meeting')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (calendarConnected === null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Schedule Meeting</h3>
            <p className="text-sm text-gray-500">with {athleteName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!calendarConnected ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h4 className="mt-4 text-lg font-medium text-gray-900">Connect Google Calendar</h4>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Connect your Google Calendar to schedule meetings directly from AthleteDesk.
              </p>
              <button onClick={handleConnectCalendar} className="btn-primary mt-4">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.5 22h-15A2.503 2.503 0 0 1 2 19.5v-15A2.503 2.503 0 0 1 4.5 2h15A2.503 2.503 0 0 1 22 4.5v15a2.503 2.503 0 0 1-2.5 2.5zM9 7v6l5 3 1-1.5-4-2.5V7H9z"/>
                </svg>
                Connect Google Calendar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label className="label">Meeting Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input w-full mt-1"
                  placeholder="Enter meeting title"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input w-full mt-1"
                  placeholder="Add meeting details..."
                />
              </div>

              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input w-full mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Time *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="input w-full mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="label">End Time *</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input w-full mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Invite (optional)</label>
                <input
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  className="input w-full mt-1"
                  placeholder="athlete@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A Google Meet link will be automatically created
                </p>
              </div>
            </form>
          )}
        </div>

        {calendarConnected && (
          <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !title || !date}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Schedule Meeting
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
