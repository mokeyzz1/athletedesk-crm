'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Athlete, LeagueLevel, RecruitingStatus, TransferPortalStatus, Json, ClassYear, OutreachStatus, RosterTeam } from '@/lib/database.types'
import { CLASS_YEARS, OUTREACH_STATUSES, REGIONS, US_STATES } from '@/lib/database.types'
import { SportSelect, SportSpecificFields } from '@/components/forms/sport-specific-fields'
import { SocialMediaFields } from '@/components/forms/social-media-fields'
import type { SocialMediaData } from '@/lib/sport-fields'

interface AthletePanelProps {
  athleteId: string | null
  isOpen: boolean
  onClose: () => void
  users: User[]
  rosterTeams: RosterTeam[]
  onAthleteUpdated: () => void
}

export function AthletePanel({
  athleteId,
  isOpen,
  onClose,
  users,
  rosterTeams,
  onAthleteUpdated
}: AthletePanelProps) {
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for dynamic fields
  const [selectedSport, setSelectedSport] = useState('')
  const [sportSpecificStats, setSportSpecificStats] = useState<Record<string, unknown>>({})
  const [socialMedia, setSocialMedia] = useState<SocialMediaData>({})

  useEffect(() => {
    if (!athleteId || !isOpen) {
      setAthlete(null)
      setSelectedSport('')
      setSportSpecificStats({})
      setSocialMedia({})
      return
    }

    async function fetchAthlete() {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', athleteId!)
        .single()

      if (fetchError) {
        setError(fetchError.message)
      } else {
        const athleteData = data as Athlete
        setAthlete(athleteData)
        setSelectedSport(athleteData.sport)
        setSportSpecificStats((athleteData.sport_specific_stats as Record<string, unknown>) || {})
        setSocialMedia((athleteData.social_media as SocialMediaData) || {})
      }
      setIsLoading(false)
    }

    fetchAthlete()
  }, [athleteId, isOpen])

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!athlete) return

    setIsSaving(true)
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
      // Recruiting fields
      class_year: formData.get('class_year') as ClassYear,
      region: (formData.get('region') as string) || null,
      outreach_status: formData.get('outreach_status') as OutreachStatus,
      // Roster team fields
      school_state: (formData.get('school_state') as string) || null,
      roster_team_id: (formData.get('roster_team_id') as string) || null,
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('athletes')
      .update(updateData as never)
      .eq('id', athlete.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      onAthleteUpdated()
      // Refresh athlete data
      const { data } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', athlete.id)
        .single()
      if (data) {
        const athleteData = data as Athlete
        setAthlete(athleteData)
        setSportSpecificStats((athleteData.sport_specific_stats as Record<string, unknown>) || {})
        setSocialMedia((athleteData.social_media as SocialMediaData) || {})
      }
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!athlete || !confirm('Are you sure you want to delete this athlete? This action cannot be undone.')) return

    setIsDeleting(true)

    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('athletes')
      .delete()
      .eq('id', athlete.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsDeleting(false)
    } else {
      onAthleteUpdated()
      onClose()
    }
  }

  const scouts = users.filter(u => u.role === 'scout' || u.role === 'admin')
  const agents = users.filter(u => u.role === 'agent' || u.role === 'admin')
  const marketingLeads = users.filter(u => u.role === 'marketing' || u.role === 'admin')

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[560px] bg-white border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="font-semibold text-gray-900">
              {isLoading ? 'Loading...' : athlete ? `Edit ${athlete.name}` : 'Athlete Details'}
            </h2>
          </div>
          {athlete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-56px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            </div>
          ) : athlete ? (
            <form onSubmit={handleSubmit} className="p-4 space-y-5">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className="label">Name *</label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      defaultValue={athlete.name}
                      className="mt-1 input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="label">Email</label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      defaultValue={athlete.email || ''}
                      className="mt-1 input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="label">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      defaultValue={athlete.phone || ''}
                      className="mt-1 input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Sport Info */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sport Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="mt-1 input w-full"
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
                      className="mt-1 input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="league_level" className="label">League/Level *</label>
                    <select
                      name="league_level"
                      id="league_level"
                      required
                      defaultValue={athlete.league_level}
                      className="mt-1 input w-full"
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
                      className="mt-1 input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="marketability_score" className="label">Marketability (0-100)</label>
                    <input
                      type="number"
                      name="marketability_score"
                      id="marketability_score"
                      min="0"
                      max="100"
                      defaultValue={athlete.marketability_score || ''}
                      className="mt-1 input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Sport-Specific Stats */}
              {selectedSport && selectedSport !== 'Other' && (
                <div className="border-t border-gray-200 pt-4">
                  <SportSpecificFields
                    sport={selectedSport}
                    values={sportSpecificStats}
                    onChange={setSportSpecificStats}
                  />
                </div>
              )}

              {/* Social Media */}
              <div className="border-t border-gray-200 pt-4">
                <SocialMediaFields
                  values={socialMedia}
                  onChange={setSocialMedia}
                />
              </div>

              {/* Recruiting Information */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recruiting Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="class_year" className="label">Class Year *</label>
                    <select
                      name="class_year"
                      id="class_year"
                      required
                      defaultValue={athlete.class_year || 'n_a'}
                      className="mt-1 input w-full"
                    >
                      {CLASS_YEARS.map(cy => (
                        <option key={cy.value} value={cy.value}>{cy.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="region" className="label">Region</label>
                    <select
                      name="region"
                      id="region"
                      defaultValue={athlete.region || ''}
                      className="mt-1 input w-full"
                    >
                      <option value="">Select Region</option>
                      {REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="outreach_status" className="label">Outreach Status *</label>
                    <select
                      name="outreach_status"
                      id="outreach_status"
                      required
                      defaultValue={athlete.outreach_status || 'not_contacted'}
                      className="mt-1 input w-full"
                    >
                      {OUTREACH_STATUSES.map(os => (
                        <option key={os.value} value={os.value}>{os.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Roster Assignment - Only show for signed athletes */}
              {athlete.outreach_status === 'signed' && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Roster Assignment</h3>
                  <p className="text-xs text-gray-500 mb-3">Assign this signed client to a roster team</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="school_state" className="label">School State</label>
                      <select
                        name="school_state"
                        id="school_state"
                        defaultValue={athlete.school_state || ''}
                        className="mt-1 input w-full"
                      >
                        <option value="">Select State</option>
                        {US_STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="roster_team_id" className="label">Roster Team</label>
                      <select
                        name="roster_team_id"
                        id="roster_team_id"
                        defaultValue={athlete.roster_team_id || ''}
                        className="mt-1 input w-full"
                      >
                        <option value="">No Team Assigned</option>
                        {rosterTeams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                      {rosterTeams.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500">No teams configured. Add teams in Settings.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="recruiting_status" className="label">Recruiting Status *</label>
                    <select
                      name="recruiting_status"
                      id="recruiting_status"
                      required
                      defaultValue={athlete.recruiting_status}
                      className="mt-1 input w-full"
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
                      className="mt-1 input w-full"
                    >
                      <option value="not_in_portal">Not in Portal</option>
                      <option value="entered_portal">Entered Portal</option>
                      <option value="committed">Committed</option>
                      <option value="transferred">Transferred</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Staff Assignments */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Staff Assignments</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="assigned_scout_id" className="label">Scout</label>
                    <select
                      name="assigned_scout_id"
                      id="assigned_scout_id"
                      defaultValue={athlete.assigned_scout_id || ''}
                      className="mt-1 input w-full"
                    >
                      <option value="">Unassigned</option>
                      {scouts.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="assigned_agent_id" className="label">Agent</label>
                    <select
                      name="assigned_agent_id"
                      id="assigned_agent_id"
                      defaultValue={athlete.assigned_agent_id || ''}
                      className="mt-1 input w-full"
                    >
                      <option value="">Unassigned</option>
                      {agents.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="assigned_marketing_lead_id" className="label">Marketing</label>
                    <select
                      name="assigned_marketing_lead_id"
                      id="assigned_marketing_lead_id"
                      defaultValue={athlete.assigned_marketing_lead_id || ''}
                      className="mt-1 input w-full"
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
              <div className="border-t border-gray-200 pt-4">
                <label htmlFor="notes" className="label">Notes</label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={3}
                  defaultValue={athlete.notes || ''}
                  className="mt-1 input w-full"
                  placeholder="Any additional notes about the athlete..."
                />
              </div>

              {/* Save Button */}
              <div className="pt-2 sticky bottom-0 bg-white pb-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary w-full"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Select an athlete to view details
            </div>
          )}
        </div>
      </div>
    </>
  )
}
