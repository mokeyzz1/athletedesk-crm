'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAthletePanel } from '@/contexts/athlete-panel-context'
import { DateDisplay } from '@/components/ui/date-display'
import { getLocalDateString } from '@/lib/helpers'
import type { OutreachStatus, ClassYear, RosterTeam } from '@/lib/database.types'
import { OUTREACH_STATUSES, CLASS_YEARS, REGIONS, US_STATES } from '@/lib/database.types'
import { bulkDeleteAthletes } from '@/lib/actions/athletes'
import type { RecruitingAthlete, RegionStats, ClassYearStats } from './page'

interface RecruitingClientProps {
  athletes: RecruitingAthlete[]
  regionStats: RegionStats[]
  classYearStats: ClassYearStats[]
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
          Last contact: <DateDisplay date={athlete.last_contacted_date} short />
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

interface RegionStatusBreakdown {
  region: string
  total: number
  statuses: {
    not_contacted: number
    contacted: number
    in_conversation: number
    interested: number
    circling_back: number
    dead_lead: number
  }
}

const STATUS_BAR_COLORS: Record<string, string> = {
  'not_contacted': 'bg-gray-400',
  'contacted': 'bg-blue-400',
  'in_conversation': 'bg-indigo-400',
  'interested': 'bg-yellow-400',
  'circling_back': 'bg-orange-400',
  'dead_lead': 'bg-red-400',
}

function RegionProgressBar({ stat, isSelected, onClick }: { stat: RegionStatusBreakdown; isSelected: boolean; onClick: () => void }) {
  const statusOrder: (keyof typeof stat.statuses)[] = ['interested', 'in_conversation', 'contacted', 'circling_back', 'dead_lead', 'not_contacted']
  const contacted = stat.total - stat.statuses.not_contacted
  const percentage = stat.total > 0 ? Math.round((contacted / stat.total) * 100) : 0

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2 -mx-2 rounded-lg transition-colors ${
        isSelected ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`w-24 text-sm truncate text-left ${isSelected ? 'font-medium text-brand-700' : 'text-gray-600'}`}>
        {stat.region}
      </div>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
        {statusOrder.map(status => {
          const count = stat.statuses[status]
          if (count === 0) return null
          const width = (count / stat.total) * 100
          return (
            <div
              key={status}
              className={`h-full ${STATUS_BAR_COLORS[status]} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${width}%` }}
              title={`${OUTREACH_STATUSES.find(s => s.value === status)?.label}: ${count}`}
            />
          )
        })}
      </div>
      <div className={`w-16 text-xs text-right ${isSelected ? 'text-brand-600 font-medium' : 'text-gray-500'}`}>
        {contacted}/{stat.total}
      </div>
    </button>
  )
}

function ClassYearProgressBar({ stat, isSelected, onClick }: { stat: ClassYearStats; isSelected: boolean; onClick: () => void }) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2 -mx-2 rounded-lg transition-colors ${
        isSelected ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`w-24 text-sm truncate text-left ${isSelected ? 'font-medium text-brand-700' : 'text-gray-600'}`}>
        {stat.label}
      </div>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor(stat.percentage)} transition-all`}
          style={{ width: `${stat.percentage}%` }}
        />
      </div>
      <div className={`w-20 text-xs text-right ${isSelected ? 'text-brand-600 font-medium' : 'text-gray-500'}`}>
        {stat.contacted}/{stat.total} ({stat.percentage}%)
      </div>
    </button>
  )
}

function TableView({
  athletes,
  onStatusChange,
  onEditClick,
  selectedAthletes,
  onSelectAll,
  onSelectAthlete,
}: {
  athletes: RecruitingAthlete[]
  onStatusChange: (athleteId: string, newStatus: OutreachStatus) => void
  onEditClick: (athleteId: string) => void
  selectedAthletes: Set<string>
  onSelectAll: (checked: boolean) => void
  onSelectAthlete: (athleteId: string, checked: boolean) => void
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
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={sortedAthletes.length > 0 && selectedAthletes.size === sortedAthletes.length}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 rounded"
                />
              </th>
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
                <td className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedAthletes.has(athlete.id)}
                    onChange={(e) => onSelectAthlete(athlete.id, e.target.checked)}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 rounded"
                  />
                </td>
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
                    ? <DateDisplay date={athlete.last_contacted_date} short />
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

export function RecruitingClient({ athletes: initialAthletes, regionStats: initialRegionStats, classYearStats: initialClassYearStats }: RecruitingClientProps) {
  const [athletes, setAthletes] = useState(initialAthletes)
  const [regionStats, setRegionStats] = useState(initialRegionStats)
  const [classYearStats, setClassYearStats] = useState(initialClassYearStats)
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [selectedClassYear, setSelectedClassYear] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [isUpdating, setIsUpdating] = useState(false)
  const [rosterTeams, setRosterTeams] = useState<RosterTeam[]>([])
  const [signingAthlete, setSigningAthlete] = useState<RecruitingAthlete | null>(null)
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { openAthletePanel } = useAthletePanel()
  const router = useRouter()
  const supabase = createClient()

  // Fetch roster teams for the signing modal
  useEffect(() => {
    async function fetchRosterTeams() {
      const { data } = await supabase.from('roster_teams').select('*').order('name')
      if (data) setRosterTeams(data as RosterTeam[])
    }
    fetchRosterTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter athletes based on selected region and class year
  const filteredAthletes = athletes.filter(a => {
    const regionMatch = selectedRegion === 'all' || a.region === selectedRegion || (selectedRegion === 'Unassigned' && !a.region)
    const classYearMatch = selectedClassYear === 'all' || a.class_year === selectedClassYear
    return regionMatch && classYearMatch
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAthletes(new Set(filteredAthletes.map(a => a.id)))
    } else {
      setSelectedAthletes(new Set())
    }
  }

  const handleSelectAthlete = (athleteId: string, checked: boolean) => {
    const newSelected = new Set(selectedAthletes)
    if (checked) {
      newSelected.add(athleteId)
    } else {
      newSelected.delete(athleteId)
    }
    setSelectedAthletes(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedAthletes.size === 0) return

    setIsDeleting(true)
    setDeleteError(null)

    const result = await bulkDeleteAthletes(Array.from(selectedAthletes))

    if (result.success) {
      setSelectedAthletes(new Set())
      setShowDeleteModal(false)
      router.refresh()
    } else {
      setDeleteError(result.error)
    }

    setIsDeleting(false)
  }

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
          ? { ...a, outreach_status: newStatus, last_contacted_date: newStatus !== 'not_contacted' ? getLocalDateString() : a.last_contacted_date }
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

      // Update class year stats
      const classYear = athlete.class_year || 'n_a'

      setClassYearStats(prev => prev.map(stat => {
        if (stat.classYear === classYear) {
          let newContacted = stat.contacted
          let newTotal = stat.total

          if (newStatus === 'signed') {
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

    // Persist to database via API (handles auto-handoffs)
    const response = await fetch(`/api/athletes/${athleteId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        school_state: newStatus === 'signed' ? schoolState : undefined,
        roster_team_id: newStatus === 'signed' ? rosterTeamId : undefined,
      }),
    })

    const result = await response.json()

    // Show handoff notification if any occurred
    if (result.handoffs && result.handoffs.length > 0) {
      for (const handoff of result.handoffs) {
        console.log(`Auto-handoff: ${handoff.type} assigned to ${handoff.assignedTo}`)
      }
    }

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
          {selectedAthletes.size > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn-secondary text-sm text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden md:inline">Delete Selected ({selectedAthletes.size})</span>
              <span className="md:hidden">{selectedAthletes.size}</span>
            </button>
          )}
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Region Progress</h2>
                <div className="flex items-center gap-4">
                  {/* Legend */}
                  <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Interested</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span>In Conv.</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Contacted</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span>Not Contacted</span>
                  </div>
                  {selectedRegion !== 'all' && (
                    <button
                      onClick={() => setSelectedRegion('all')}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {/* Calculate region stats based on selected class year filter */}
                {(() => {
                  const filteredByClass = selectedClassYear === 'all'
                    ? athletes
                    : athletes.filter(a => a.class_year === selectedClassYear)

                  const dynamicRegionStats: RegionStatusBreakdown[] = regionStats.map(stat => {
                    const athletesInRegion = filteredByClass.filter(a =>
                      a.region === stat.region || (stat.region === 'Unassigned' && !a.region)
                    )
                    return {
                      region: stat.region,
                      total: athletesInRegion.length,
                      statuses: {
                        not_contacted: athletesInRegion.filter(a => a.outreach_status === 'not_contacted').length,
                        contacted: athletesInRegion.filter(a => a.outreach_status === 'contacted').length,
                        in_conversation: athletesInRegion.filter(a => a.outreach_status === 'in_conversation').length,
                        interested: athletesInRegion.filter(a => a.outreach_status === 'interested').length,
                        circling_back: athletesInRegion.filter(a => a.outreach_status === 'circling_back').length,
                        dead_lead: athletesInRegion.filter(a => a.outreach_status === 'dead_lead').length,
                      },
                    }
                  }).filter(stat => stat.total > 0)

                  return dynamicRegionStats.map(stat => (
                    <RegionProgressBar
                      key={stat.region}
                      stat={stat}
                      isSelected={selectedRegion === stat.region}
                      onClick={() => setSelectedRegion(selectedRegion === stat.region ? 'all' : stat.region)}
                    />
                  ))
                })()}
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
                selectedAthletes={selectedAthletes}
                onSelectAll={handleSelectAll}
                onSelectAthlete={handleSelectAthlete}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Athletes</h3>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <span className="font-semibold">{selectedAthletes.size} prospect{selectedAthletes.size > 1 ? 's' : ''}</span>?
              This will also delete all associated communications and documents. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteError(null)
                }}
                disabled={isDeleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>Delete {selectedAthletes.size} Prospect{selectedAthletes.size > 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
