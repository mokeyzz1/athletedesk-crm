'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { User, LeagueLevel, RecruitingStatus, TransferPortalStatus, AthleteInsert, Athlete, Json } from '@/lib/database.types'
import { SportSelect, SportSpecificFields } from '@/components/forms/sport-specific-fields'
import { SocialMediaFields } from '@/components/forms/social-media-fields'
import type { SocialMediaData } from '@/lib/sport-fields'

interface DuplicateWarning {
  type: 'name' | 'email'
  athlete: { id: string; name: string; email: string | null }
}

export default function NewAthletePage() {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])

  // Form state for dynamic fields
  const [selectedSport, setSelectedSport] = useState('')
  const [sportSpecificStats, setSportSpecificStats] = useState<Record<string, unknown>>({})
  const [socialMedia, setSocialMedia] = useState<SocialMediaData>({})

  // Duplicate detection
  const [athleteName, setAthleteName] = useState('')
  const [athleteEmail, setAthleteEmail] = useState('')
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([])
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from('users').select('*')
      if (data) setUsers(data as User[])
    }
    fetchUsers()
  }, [supabase])

  // Check for duplicates when name or email changes
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!athleteName && !athleteEmail) {
        setDuplicateWarnings([])
        return
      }

      setIsCheckingDuplicates(true)
      const warnings: DuplicateWarning[] = []

      try {
        // Check for name duplicates (case-insensitive)
        if (athleteName.trim().length >= 3) {
          const { data: nameMatches } = await supabase
            .from('athletes')
            .select('id, name, email')
            .ilike('name', athleteName.trim())
            .limit(3)

          if (nameMatches && nameMatches.length > 0) {
            nameMatches.forEach((athlete: { id: string; name: string; email: string | null }) => {
              warnings.push({
                type: 'name',
                athlete
              })
            })
          }
        }

        // Check for email duplicates (exact match)
        if (athleteEmail.trim().length >= 5 && athleteEmail.includes('@')) {
          const { data: emailMatches } = await supabase
            .from('athletes')
            .select('id, name, email')
            .ilike('email', athleteEmail.trim())
            .limit(3)

          if (emailMatches && emailMatches.length > 0) {
            emailMatches.forEach((athlete: { id: string; name: string; email: string | null }) => {
              // Avoid duplicate warnings for same athlete
              if (!warnings.find(w => w.athlete.id === athlete.id)) {
                warnings.push({
                  type: 'email',
                  athlete
                })
              }
            })
          }
        }

        setDuplicateWarnings(warnings)
      } catch (err) {
        console.error('Error checking duplicates:', err)
      } finally {
        setIsCheckingDuplicates(false)
      }
    }

    // Debounce the check
    const timeout = setTimeout(checkDuplicates, 500)
    return () => clearTimeout(timeout)
  }, [athleteName, athleteEmail, supabase])

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
    // Reset sport-specific stats when sport changes
    setSportSpecificStats({})
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

    const athleteData: AthleteInsert = {
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

    const { data, error: insertError } = await supabase
      .from('athletes')
      .insert(athleteData as never)
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setIsSubmitting(false)
      return
    }

    const athlete = data as Athlete
    router.push(`/athletes/${athlete.id}`)
  }

  const scouts = users.filter(u => u.role === 'scout' || u.role === 'admin')
  const agents = users.filter(u => u.role === 'agent' || u.role === 'admin')
  const marketingLeads = users.filter(u => u.role === 'marketing' || u.role === 'admin')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Athlete</h1>
        <p className="text-gray-600">Enter the athlete&apos;s information below</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Duplicate Warning */}
      {duplicateWarnings.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Possible duplicate detected</h4>
              <p className="text-sm text-yellow-700 mt-1">
                The following existing athletes have similar information:
              </p>
              <ul className="mt-2 space-y-1">
                {duplicateWarnings.map((warning, idx) => (
                  <li key={idx} className="text-sm">
                    <a
                      href={`/athletes/${warning.athlete.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-800 hover:text-yellow-900 underline font-medium"
                    >
                      {warning.athlete.name}
                    </a>
                    {warning.athlete.email && (
                      <span className="text-yellow-700"> ({warning.athlete.email})</span>
                    )}
                    <span className="text-yellow-600 ml-1">
                      - matches {warning.type}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-yellow-600 mt-2">
                You can still proceed if this is a different athlete.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Basic Info */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="label">
                Name *
                {isCheckingDuplicates && (
                  <span className="ml-2 text-gray-400 text-xs font-normal">Checking...</span>
                )}
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
                className="mt-1 input"
              />
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                value={athleteEmail}
                onChange={(e) => setAthleteEmail(e.target.value)}
                className="mt-1 input"
              />
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone</label>
              <input type="tel" name="phone" id="phone" className="mt-1 input" />
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
              <input type="text" name="position" id="position" className="mt-1 input" placeholder="e.g., Point Guard, Quarterback" />
            </div>
            <div>
              <label htmlFor="school" className="label">School</label>
              <input type="text" name="school" id="school" className="mt-1 input" />
            </div>
            <div>
              <label htmlFor="league_level" className="label">League/Level *</label>
              <select name="league_level" id="league_level" required className="mt-1 input">
                <option value="high_school">High School</option>
                <option value="college">College</option>
                <option value="professional">Professional</option>
                <option value="international">International</option>
              </select>
            </div>
            <div>
              <label htmlFor="eligibility_year" className="label">Eligibility Year</label>
              <input type="number" name="eligibility_year" id="eligibility_year" min="2020" max="2035" className="mt-1 input" />
            </div>
            <div>
              <label htmlFor="marketability_score" className="label">Marketability Score (0-100)</label>
              <input type="number" name="marketability_score" id="marketability_score" min="0" max="100" className="mt-1 input" />
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
              <select name="recruiting_status" id="recruiting_status" required className="mt-1 input">
                <option value="not_recruiting">Not Recruiting</option>
                <option value="open_to_contact">Open to Contact</option>
                <option value="actively_recruiting">Actively Recruiting</option>
                <option value="committed">Committed</option>
                <option value="signed">Signed</option>
              </select>
            </div>
            <div>
              <label htmlFor="transfer_portal_status" className="label">Transfer Portal Status</label>
              <select name="transfer_portal_status" id="transfer_portal_status" className="mt-1 input">
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
              <select name="assigned_scout_id" id="assigned_scout_id" className="mt-1 input">
                <option value="">Unassigned</option>
                {scouts.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assigned_agent_id" className="label">Assigned Agent</label>
              <select name="assigned_agent_id" id="assigned_agent_id" className="mt-1 input">
                <option value="">Unassigned</option>
                {agents.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assigned_marketing_lead_id" className="label">Marketing Lead</label>
              <select name="assigned_marketing_lead_id" id="assigned_marketing_lead_id" className="mt-1 input">
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
          <textarea name="notes" id="notes" rows={4} className="mt-1 input" placeholder="Any additional notes about the athlete..." />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Creating...' : 'Create Athlete'}
          </button>
        </div>
      </form>
    </div>
  )
}
