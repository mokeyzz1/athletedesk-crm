'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { User, Athlete, CommunicationType, CommunicationLogInsert } from '@/lib/database.types'
import { EmailTemplateSelector } from '@/components/email-template-selector'

export default function NewCommunicationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedAthleteId = searchParams.get('athlete')
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedAthleteId, setSelectedAthleteId] = useState(preSelectedAthleteId || '')

  useEffect(() => {
    async function fetchData() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('google_sso_id', user.id)
          .single()
        if (userData) setCurrentUser(userData as User)
      }

      // Get athletes
      const { data: athletesData } = await supabase
        .from('athletes')
        .select('*')
        .order('name')
      if (athletesData) {
        setAthletes(athletesData as Athlete[])
        // Set pre-selected athlete if provided
        if (preSelectedAthleteId) {
          setSelectedAthleteId(preSelectedAthleteId)
        }
      }
    }
    fetchData()
  }, [supabase, preSelectedAthleteId])

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId)

  const handleTemplateSelect = (templateSubject: string, templateBody: string) => {
    setSubject(templateSubject)
    setNotes(templateBody)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    if (!currentUser) {
      setError('You must be logged in to log a communication')
      setIsSubmitting(false)
      return
    }

    const communicationData: CommunicationLogInsert = {
      athlete_id: selectedAthleteId,
      staff_member_id: currentUser.id,
      type: formData.get('type') as CommunicationType,
      subject: subject || null,
      notes: notes || null,
      communication_date: formData.get('communication_date') as string,
      follow_up_date: (formData.get('follow_up_date') as string) || null,
      follow_up_completed: false,
    }

    const { error: insertError } = await supabase
      .from('communications_log')
      .insert(communicationData as never)

    if (insertError) {
      setError(insertError.message)
      setIsSubmitting(false)
      return
    }

    router.push('/communications')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Log Communication</h1>
        <p className="text-gray-600">Record a call, email, text, or meeting with an athlete</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="athlete_id" className="label">Athlete *</label>
            <select
              name="athlete_id"
              id="athlete_id"
              required
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="mt-1 input"
            >
              <option value="">Select an athlete</option>
              {athletes.map(athlete => (
                <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="type" className="label">Type *</label>
            <select name="type" id="type" required className="mt-1 input">
              <option value="call">Phone Call</option>
              <option value="email">Email</option>
              <option value="text">Text Message</option>
              <option value="zoom">Video Call / Zoom</option>
            </select>
          </div>

          <div>
            <label htmlFor="communication_date" className="label">Date *</label>
            <input
              type="date"
              name="communication_date"
              id="communication_date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              className="mt-1 input"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label htmlFor="subject" className="label">Subject</label>
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Use Template
              </button>
            </div>
            <input
              type="text"
              name="subject"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 input"
              placeholder="Brief description of the communication"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="label">Notes</label>
            <textarea
              name="notes"
              id="notes"
              rows={8}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 input"
              placeholder="Details about the conversation..."
            />
          </div>

          <div>
            <label htmlFor="follow_up_date" className="label">Follow-up Date</label>
            <input
              type="date"
              name="follow_up_date"
              id="follow_up_date"
              className="mt-1 input"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : 'Log Communication'}
          </button>
        </div>
      </form>

      {showTemplates && (
        <EmailTemplateSelector
          onSelect={handleTemplateSelect}
          athleteName={selectedAthlete?.name}
          schoolName={selectedAthlete?.school || undefined}
          onClose={() => setShowTemplates(false)}
        />
      )}
        </div>
      </div>
    </div>
  )
}
