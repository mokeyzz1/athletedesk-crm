'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { User, LeagueLevel, RecruitingStatus, TransferPortalStatus, Athlete, Json } from '@/lib/database.types'
import { SportSelect, SportSpecificFields } from '@/components/forms/sport-specific-fields'
import { SocialMediaFields } from '@/components/forms/social-media-fields'
import type { SocialMediaData } from '@/lib/sport-fields'

export default function EditAthletePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [athlete, setAthlete] = useState<Athlete | null>(null)

  // Form state for dynamic fields
  const [selectedSport, setSelectedSport] = useState('')
  const [sportSpecificStats, setSportSpecificStats] = useState<Record<string, unknown>>({})
  const [socialMedia, setSocialMedia] = useState<SocialMediaData>({})

  useEffect(() => {
    async function fetchData() {
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', id)
        .single()

      if (athleteData) {
        const athlete = athleteData as Athlete
        setAthlete(athlete)
        setSelectedSport(athlete.sport)
        setSportSpecificStats((athlete.sport_specific_stats as Record<string, unknown>) || {})
        setSocialMedia((athlete.social_media as SocialMediaData) || {})
      }

      const { data: usersData } = await supabase.from('users').select('*')
      if (usersData) {
        setUsers(usersData as User[])
      }

      setIsLoading(false)
    }
    fetchData()
  }, [supabase, id])

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
    // Don't reset sport-specific stats when editing
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Determine the actual sport value
    let sportValue = selectedSport
    if (selectedSport === 'Other') {
      sportValue = formData.get('sport_other') as string || 'Other'
    }

    // Filter out empty values from sportSpecificStats
    const filteredStats = Object.fromEntries(
      Object.entries(sportSpecificStats).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )

    // Filter out empty values from socialMedia
    const filteredSocialMedia = Object.fromEntries(
      Object.entries(socialMedia).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== 0)
    )

    const updateData = {
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      school: (formData.get('school') as string) || null,
      sport: sportValue,
      position: (formData.get('position') as string) || null,
      league_level: formData.get('league_level') as LeagueLevel,
      eligibility_year: formData.get('eligibility_year') ? parseInt(formData.get('eligibility_year') as string) : null,
      recruiting_status: formData.get('recruiting_status') as RecruitingStatus,
      transfer_portal_status: formData.get('transfer_portal_status') as TransferPortalStatus,
      marketability_score: formData.get('marketability_score') ? parseInt(formData.get('marketability_score') as string) : null,
      assigned_scout_id: (formData.get('assigned_scout_id') as string) || null,
      assigned_agent_id: (formData.get('assigned_agent_id') as string) || null,
      assigned_marketing_lead_id: (formData.get('assigned_marketing_lead_id') as string) || null,
      notes: (formData.get('notes') as string) || null,
      sport_specific_stats: Object.keys(filteredStats).length > 0 ? filteredStats as Json : null,
      social_media: Object.keys(filteredSocialMedia).length > 0 ? filteredSocialMedia as Json : null,
    }

    const { error: updateError } = await supabase
      .from('athletes')
      .update(updateData as never)
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
      return
    }

    router.push(`/athletes/${id}`)
  }

  const scouts = users.filter(u => u.role === 'scout' || u.role === 'admin')
  const agents = users.filter(u => u.role === 'agent' || u.role === 'admin')
  const marketingLeads = users.filter(u => u.role === 'marketing' || u.role === 'admin')

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-12">
          <p className="text-gray-500">Athlete not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Athlete</h1>
        <p className="text-gray-600">Update {athlete.name}&apos;s information</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Basic Info */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="label">Name *</label>
              <input
                type="text"
                name="name"
                id="name"
                required
                defaultValue={athlete.name}
                className="mt-1 input"
              />
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                defaultValue={athlete.email || ''}
                className="mt-1 input"
              />
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone</label>
              <input
                type="tel"
                name="phone"
                id="phone"
                defaultValue={athlete.phone || ''}
                className="mt-1 input"
              />
            </div>
          </div>
        </div>

        {/* Sport Info */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sport Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SportSelect
              value={selectedSport}
              onChange={handleSportChange}
              required
            />
            <div>
              <label htmlFor="position" className="label">Position</label>
              <input
                type="text"
                name="position"
                id="position"
                defaultValue={athlete.position || ''}
                className="mt-1 input"
                placeholder="e.g., Point Guard, Quarterback"
              />
            </div>
            <div>
              <label htmlFor="school" className="label">School</label>
              <input
                type="text"
                name="school"
                id="school"
                defaultValue={athlete.school || ''}
                className="mt-1 input"
              />
            </div>
            <div>
              <label htmlFor="league_level" className="label">League/Level *</label>
              <select
                name="league_level"
                id="league_level"
                required
                defaultValue={athlete.league_level}
                className="mt-1 input"
              >
                <option value="high_school">High School</option>
                <option value="college">College</option>
                <option value="professional">Professional</option>
                <option value="international">International</option>
              </select>
            </div>
            <div>
              <label htmlFor="eligibility_year" className="label">Eligibility Year</label>
              <input
                type="number"
                name="eligibility_year"
                id="eligibility_year"
                min="2020"
                max="2035"
                defaultValue={athlete.eligibility_year || ''}
                className="mt-1 input"
              />
            </div>
            <div>
              <label htmlFor="marketability_score" className="label">Marketability Score (0-100)</label>
              <input
                type="number"
                name="marketability_score"
                id="marketability_score"
                min="0"
                max="100"
                defaultValue={athlete.marketability_score || ''}
                className="mt-1 input"
              />
            </div>
          </div>
        </div>

        {/* Sport-Specific Stats - Dynamic based on selected sport */}
        {selectedSport && selectedSport !== 'Other' && (
          <SportSpecificFields
            sport={selectedSport}
            values={sportSpecificStats}
            onChange={setSportSpecificStats}
          />
        )}

        {/* Social Media */}
        <SocialMediaFields
          values={socialMedia}
          onChange={setSocialMedia}
        />

        {/* Status */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="recruiting_status" className="label">Recruiting Status *</label>
              <select
                name="recruiting_status"
                id="recruiting_status"
                required
                defaultValue={athlete.recruiting_status}
                className="mt-1 input"
              >
                <option value="not_recruiting">Not Recruiting</option>
                <option value="open_to_contact">Open to Contact</option>
                <option value="actively_recruiting">Actively Recruiting</option>
                <option value="committed">Committed</option>
                <option value="signed">Signed</option>
              </select>
            </div>
            <div>
              <label htmlFor="transfer_portal_status" className="label">Transfer Portal Status</label>
              <select
                name="transfer_portal_status"
                id="transfer_portal_status"
                defaultValue={athlete.transfer_portal_status}
                className="mt-1 input"
              >
                <option value="not_in_portal">Not in Portal</option>
                <option value="entered_portal">Entered Portal</option>
                <option value="committed">Committed</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assignments */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Assignments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="assigned_scout_id" className="label">Assigned Scout</label>
              <select
                name="assigned_scout_id"
                id="assigned_scout_id"
                defaultValue={athlete.assigned_scout_id || ''}
                className="mt-1 input"
              >
                <option value="">Unassigned</option>
                {scouts.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assigned_agent_id" className="label">Assigned Agent</label>
              <select
                name="assigned_agent_id"
                id="assigned_agent_id"
                defaultValue={athlete.assigned_agent_id || ''}
                className="mt-1 input"
              >
                <option value="">Unassigned</option>
                {agents.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assigned_marketing_lead_id" className="label">Marketing Lead</label>
              <select
                name="assigned_marketing_lead_id"
                id="assigned_marketing_lead_id"
                defaultValue={athlete.assigned_marketing_lead_id || ''}
                className="mt-1 input"
              >
                <option value="">Unassigned</option>
                {marketingLeads.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="border-t border-gray-200 pt-6">
          <label htmlFor="notes" className="label">Notes</label>
          <textarea
            name="notes"
            id="notes"
            rows={4}
            defaultValue={athlete.notes || ''}
            className="mt-1 input"
            placeholder="Any additional notes about the athlete..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
