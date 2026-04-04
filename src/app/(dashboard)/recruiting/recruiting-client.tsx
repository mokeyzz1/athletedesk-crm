'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAthletePanel } from '@/contexts/athlete-panel-context'
import type { OutreachStatus, ClassYear, RosterTeam } from '@/lib/database.types'
import { OUTREACH_STATUSES, CLASS_YEARS, REGIONS, US_STATES } from '@/lib/database.types'
import type { RecruitingAthlete, RegionStats } from './page'

interface RecruitingClientProps {
  athletes: RecruitingAthlete[]
  regionStats: RegionStats[]
}

interface SigningModalProps {
  athlete: RecruitingAthlete
  rosterTeams: RosterTeam[]
  onConfirm: (schoolState: string | null, rosterTeamId: string | null) => void
  onCancel: () => void
}

function SigningModal({ athlete, rosterTeams, onConfirm, onCancel }: SigningModalProps) {
  const [schoolState, setSchoolState] = useState<string>('')
  const [rosterTeamId, setRosterTeamId] = useState<string>('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign {athlete.name}</h2>
        <p className="text-sm text-gray-500 mb-4">Assign this athlete to a roster team before moving them to signed status.</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="school_state" className="block text-sm font-medium text-gray-700 mb-1">
              School State
            </label>
            <select
              id="school_state"
              value={schoolState}
              onChange={(e) => setSchoolState(e.target.value)}
              className="input w-full"
            >
              <option value="">Select State</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="roster_team" className="block text-sm font-medium text-gray-700 mb-1">
              Roster Team
            </label>
            <select
              id="roster_team"
              value={rosterTeamId}
              onChange={(e) => setRosterTeamId(e.target.value)}
              className="input w-full"
            >
              <option value="">Select Team</option>
              {rosterTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            {rosterTeams.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No roster teams configured. Add teams in Settings first.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(schoolState || null, rosterTeamId || null)}
            className="btn-primary"
          >
            Confirm Signing
          </button>
        </div>
      </div>
    </div>
  )
}

type ViewMode = 'kanban' | 'table'

const OUTREACH_COLUMNS: { key: OutreachStatus; label: string; color: string; bgColor: string }[] = [
  { key: 'not_contacted', label: 'Not Contacted', color: 'border-gray-300', bgColor: 'bg-gray-50' },
  { key: 'contacted', label: 'Contacted', color: 'border-blue-300', bgColor: 'bg-blue-50' },
  { key: 'in_conversation', label: 'In Conversation', color: 'border-indigo-300', bgColor: 'bg-indigo-50' },
  { key: 'interested', label: 'Interested', color: 'border-yellow-300', bgColor: 'bg-yellow-50' },
  { key: 'signed', label: 'Signed', color: 'border-green-300', bgColor: 'bg-green-50' },
  { key: 'circling_back', label: 'Circling Back', color: 'border-orange-300', bgColor: 'bg-orange-50' },
  { key: 'dead_lead', label: 'Dead Lead', color: 'border-red-300', bgColor: 'bg-red-50' },
]

const STATUS_COLORS: Record<OutreachStatus, string> = {
  'not_contacted': 'bg-gray-100 text-gray-700',
  'contacted': 'bg-blue-100 text-blue-700',
  'in_conversation': 'bg-indigo-100 text-indigo-700',
  'interested': 'bg-yellow-100 text-yellow-700',
  'circling_back': 'bg-orange-100 text-orange-700',
  'dead_lead': 'bg-red-100 text-red-700',
  'signed': 'bg-green-100 text-green-700',
}

function AthleteCard({
  athlete,
  onStatusChange,
  onEditClick,
}: {
  athlete: RecruitingAthlete
  onStatusChange: (athleteId: string, newStatus: OutreachStatus) => void
  onEditClick: (athleteId: string) => void
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  return (
    <div className="bg-white rounded border border-gray-200 p-3 hover:border-gray-300 transition-colors">
      <div className="font-medium text-gray-900 text-sm">{athlete.name}</div>
      <div className="text-xs text-gray-500 mt-1">
        {athlete.sport}
        {athlete.school && ` - ${athlete.school}`}
      </div>
      {athlete.position && (
        <div className="text-xs text-gray-400">{athlete.position}</div>
      )}

      {/* Class Year Badge */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
          {CLASS_YEARS.find(c => c.value === athlete.class_year)?.label || 'N/A'}
        </span>
        {athlete.region && (
          <span className="text-xs text-gray-400">{athlete.region}</span>
        )}
      </div>

      {/* Status dropdown */}
      <div className="mt-2 relative">
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium"
        >
          Change Status
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showStatusMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 min-w-[160px]">
              {OUTREACH_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    if (s.value !== athlete.outreach_status) {
                      onStatusChange(athlete.id, s.value)
                    }
                    setShowStatusMenu(false)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                    s.value === athlete.outreach_status ? 'bg-gray-50 font-medium' : ''
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {athlete.last_contacted_date && (
        <div className="text-xs text-gray-400 mt-2">
          Last contact: {new Date(athlete.last_contacted_date).toLocaleDateString()}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
        <button
          onClick={() => onEditClick(athlete.id)}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          Edit
        </button>
        <Link
          href={`/athletes/${athlete.id}`}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          View
        </Link>
      </div>
    </div>
  )
}

function StatusColumn({
  column,
  athletes,
  onStatusChange,
  onEditClick,
}: {
  column: typeof OUTREACH_COLUMNS[number]
  athletes: RecruitingAthlete[]
  onStatusChange: (athleteId: string, newStatus: OutreachStatus) => void
  onEditClick: (athleteId: string) => void
}) {
  return (
    <div className="flex-shrink-0 w-56 md:w-64">
      <div className={`border-b-2 ${column.color} px-3 py-2`}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700 text-sm">{column.label}</h3>
          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-medium text-gray-600">
            {athletes.length}
          </span>
        </div>
      </div>
      <div className={`${column.bgColor} rounded-b border border-t-0 border-gray-200 p-2 min-h-[300px] max-h-[calc(100vh-350px)] overflow-y-auto`}>
        <div className="space-y-2">
          {athletes.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              athlete={athlete}
              onStatusChange={onStatusChange}
              onEditClick={onEditClick}
            />
          ))}
        </div>
        {athletes.length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm">
            No athletes
          </div>
        )}
      </div>
    </div>
  )
}

function RegionProgressBar({ stat }: { stat: RegionStats }) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-sm text-gray-600 truncate">{stat.region}</div>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor(stat.percentage)} transition-all`}
          style={{ width: `${stat.percentage}%` }}
        />
      </div>
      <div className="w-20 text-xs text-gray-500 text-right">
        {stat.contacted}/{stat.total} ({stat.percentage}%)
      </div>
    </div>
  )
}

function TableView({
  athletes,
  onStatusChange,
  onEditClick,
}: {
  athletes: RecruitingAthlete[]
  onStatusChange: (athleteId: string, newStatus: OutreachStatus) => void
  onEditClick: (athleteId: string) => void
}) {
  const [sortField, setSortField] = useState<'name' | 'sport' | 'class_year' | 'region' | 'outreach_status'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const sortedAthletes = [...athletes].sort((a, b) => {
    let aVal = a[sortField] || ''
    let bVal = b[sortField] || ''
    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    }
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortHeader = ({ field, label }: { field: typeof sortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader field="name" label="Name" />
              <SortHeader field="sport" label="Sport" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
              <SortHeader field="class_year" label="Class" />
              <SortHeader field="region" label="Region" />
              <SortHeader field="outreach_status" label="Status" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emails</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAthletes.map((athlete) => (
              <tr key={athlete.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/athletes/${athlete.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600">
                    {athlete.name}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {athlete.sport}
                  {athlete.position && <span className="text-gray-400"> - {athlete.position}</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {athlete.school || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-medium">
                    {CLASS_YEARS.find(c => c.value === athlete.class_year)?.label || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {athlete.region || <span className="text-gray-400">Unassigned</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <select
                    value={athlete.outreach_status}
                    onChange={(e) => onStatusChange(athlete.id, e.target.value as OutreachStatus)}
                    className={`text-xs px-2 py-1 rounded font-medium border-0 cursor-pointer ${STATUS_COLORS[athlete.outreach_status]}`}
                  >
                    {OUTREACH_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">{athlete.emailCount}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {athlete.last_contacted_date
                    ? new Date(athlete.last_contacted_date).toLocaleDateString()
                    : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button
                    onClick={() => onEditClick(athlete.id)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedAthletes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No prospects match your filters
        </div>
      )}
    </div>
  )
}

export function RecruitingClient({ athletes: initialAthletes, regionStats: initialRegionStats }: RecruitingClientProps) {
  const [athletes, setAthletes] = useState(initialAthletes)
  const [regionStats, setRegionStats] = useState(initialRegionStats)
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [selectedClassYear, setSelectedClassYear] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [isUpdating, setIsUpdating] = useState(false)
  const [rosterTeams, setRosterTeams] = useState<RosterTeam[]>([])
  const [signingAthlete, setSigningAthlete] = useState<RecruitingAthlete | null>(null)
  const { openAthletePanel } = useAthletePanel()
  const supabase = createClient()

  // Fetch roster teams for the signing modal
  useEffect(() => {
    async function fetchRosterTeams() {
      const { data } = await supabase.from('roster_teams').select('*').order('name')
      if (data) setRosterTeams(data as RosterTeam[])
    }
    fetchRosterTeams()
  }, [])

  // Filter athletes based on selected region and class year
  const filteredAthletes = athletes.filter(a => {
    const regionMatch = selectedRegion === 'all' || a.region === selectedRegion || (selectedRegion === 'Unassigned' && !a.region)
    const classYearMatch = selectedClassYear === 'all' || a.class_year === selectedClassYear
    return regionMatch && classYearMatch
  })

  // Group filtered athletes by status for Kanban
  const columnGroups = OUTREACH_COLUMNS.map(column => ({
    ...column,
    athletes: filteredAthletes.filter(a => a.outreach_status === column.key),
  }))

  const handleStatusChange = async (athleteId: string, newStatus: OutreachStatus) => {
    const athlete = athletes.find(a => a.id === athleteId)
    if (!athlete) return

    // If changing to signed, show the signing modal
    if (newStatus === 'signed') {
      setSigningAthlete(athlete)
      return
    }

    // For other statuses, proceed normally
    await updateAthleteStatus(athleteId, newStatus, null, null)
  }

  const handleSigningConfirm = async (schoolState: string | null, rosterTeamId: string | null) => {
    if (!signingAthlete) return
    await updateAthleteStatus(signingAthlete.id, 'signed', schoolState, rosterTeamId)
    setSigningAthlete(null)
  }

  const updateAthleteStatus = async (
    athleteId: string,
    newStatus: OutreachStatus,
    schoolState: string | null,
    rosterTeamId: string | null
  ) => {
    setIsUpdating(true)

    const athlete = athletes.find(a => a.id === athleteId)
    const oldStatus = athlete?.outreach_status

    // Optimistic update - remove from list if signed
    if (newStatus === 'signed') {
      setAthletes(prev => prev.filter(a => a.id !== athleteId))
    } else {
      setAthletes(prev => prev.map(a =>
        a.id === athleteId
          ? { ...a, outreach_status: newStatus, last_contacted_date: newStatus !== 'not_contacted' ? new Date().toISOString().split('T')[0] : a.last_contacted_date }
          : a
      ))
    }

    // Update region stats
    if (athlete) {
      const region = athlete.region || 'Unassigned'

      setRegionStats(prev => prev.map(stat => {
        if (stat.region === region) {
          let newContacted = stat.contacted
          let newTotal = stat.total

          if (newStatus === 'signed') {
            // Remove from total when signed
            newTotal--
            if (oldStatus !== 'not_contacted') {
              newContacted--
            }
          } else {
            if (oldStatus === 'not_contacted' && newStatus !== 'not_contacted') {
              newContacted++
            }
            if (oldStatus !== 'not_contacted' && newStatus === 'not_contacted') {
              newContacted--
            }
          }
          return {
            ...stat,
            total: newTotal,
            contacted: newContacted,
            percentage: newTotal > 0 ? Math.round((newContacted / newTotal) * 100) : 0,
          }
        }
        return stat
      }))
    }

    // Persist to database
    const updateData: {
      outreach_status: OutreachStatus
      last_contacted_date?: string
      school_state?: string | null
      roster_team_id?: string | null
    } = {
      outreach_status: newStatus,
    }

    if (newStatus !== 'not_contacted' && oldStatus === 'not_contacted') {
      updateData.last_contacted_date = new Date().toISOString().split('T')[0]
    }

    if (newStatus === 'signed') {
      updateData.school_state = schoolState
      updateData.roster_team_id = rosterTeamId
    }

    await supabase
      .from('athletes')
      .update(updateData as never)
      .eq('id', athleteId)

    setIsUpdating(false)
  }

  const totalProspects = athletes.length
  const totalContacted = athletes.filter(a => a.outreach_status !== 'not_contacted').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 min-h-[56px] md:h-[92px] flex items-center justify-between px-4 md:px-6 py-3 md:py-0 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Recruiting Database</h1>
          <p className="text-gray-500 text-sm">
            {totalProspects} prospects - {totalContacted} contacted ({totalProspects > 0 ? Math.round((totalContacted / totalProspects) * 100) : 0}%)
            {isUpdating && <span className="ml-2 text-brand-600">Saving...</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="hidden md:flex items-center bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>
          <Link href="/athletes/new" className="btn-primary text-sm">
            <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden md:inline">Add Prospect</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {totalProspects > 0 ? (
          <div className="px-4 md:px-6 py-4">
            {/* Region Progress Section */}
            <div className="card mb-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Region Progress</h2>
              <div className="space-y-2">
                {regionStats.map(stat => (
                  <RegionProgressBar key={stat.region} stat={stat} />
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="input text-sm py-1.5"
                >
                  <option value="all">All Regions</option>
                  {REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Class Year</label>
                <select
                  value={selectedClassYear}
                  onChange={(e) => setSelectedClassYear(e.target.value)}
                  className="input text-sm py-1.5"
                >
                  <option value="all">All Classes</option>
                  {CLASS_YEARS.map(cy => (
                    <option key={cy.value} value={cy.value}>{cy.label}</option>
                  ))}
                </select>
              </div>
              {/* Mobile view toggle */}
              <div className="md:hidden">
                <label className="block text-xs font-medium text-gray-500 mb-1">View</label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ViewMode)}
                  className="input text-sm py-1.5"
                >
                  <option value="table">Table</option>
                  <option value="kanban">Kanban</option>
                </select>
              </div>
              <div className="flex-1 flex items-end justify-end">
                <p className="text-sm text-gray-500">
                  Showing {filteredAthletes.length} of {totalProspects} prospects
                </p>
              </div>
            </div>

            {/* View Content */}
            {viewMode === 'table' ? (
              <TableView
                athletes={filteredAthletes}
                onStatusChange={handleStatusChange}
                onEditClick={openAthletePanel}
              />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-4">
                {columnGroups.map((column) => (
                  <StatusColumn
                    key={column.key}
                    column={column}
                    athletes={column.athletes}
                    onStatusChange={handleStatusChange}
                    onEditClick={openAthletePanel}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 md:px-6 py-4">
            <div className="card">
              <div className="empty-state">
                <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="empty-state-title">No prospects yet</p>
                <p className="empty-state-description">Start building your recruiting database by adding athlete prospects.</p>
                <Link href="/athletes/new" className="btn-primary mt-4 inline-flex">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add First Prospect
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Signing Modal */}
      {signingAthlete && (
        <SigningModal
          athlete={signingAthlete}
          rosterTeams={rosterTeams}
          onConfirm={handleSigningConfirm}
          onCancel={() => setSigningAthlete(null)}
        />
      )}
    </div>
  )
}
