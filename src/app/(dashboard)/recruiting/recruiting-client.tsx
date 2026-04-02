'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAthletePanel } from '@/contexts/athlete-panel-context'
import type { OutreachStatus, ClassYear } from '@/lib/database.types'
import { OUTREACH_STATUSES, CLASS_YEARS, REGIONS } from '@/lib/database.types'
import type { RecruitingAthlete, RegionStats } from './page'

interface RecruitingClientProps {
  athletes: RecruitingAthlete[]
  regionStats: RegionStats[]
}

const OUTREACH_COLUMNS: { key: OutreachStatus; label: string; color: string; bgColor: string }[] = [
  { key: 'not_contacted', label: 'Not Contacted', color: 'border-gray-300', bgColor: 'bg-gray-50' },
  { key: 'contacted', label: 'Contacted', color: 'border-blue-300', bgColor: 'bg-blue-50' },
  { key: 'in_conversation', label: 'In Conversation', color: 'border-indigo-300', bgColor: 'bg-indigo-50' },
  { key: 'interested', label: 'Interested', color: 'border-yellow-300', bgColor: 'bg-yellow-50' },
  { key: 'committed', label: 'Committed', color: 'border-green-300', bgColor: 'bg-green-50' },
  { key: 'circling_back', label: 'Circling Back', color: 'border-orange-300', bgColor: 'bg-orange-50' },
  { key: 'dead_lead', label: 'Dead Lead', color: 'border-red-300', bgColor: 'bg-red-50' },
]

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

  const currentStatus = OUTREACH_STATUSES.find(s => s.value === athlete.outreach_status)

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
              {OUTREACH_STATUSES.filter(s => s.value !== 'signed').map((s) => (
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

export function RecruitingClient({ athletes: initialAthletes, regionStats: initialRegionStats }: RecruitingClientProps) {
  const [athletes, setAthletes] = useState(initialAthletes)
  const [regionStats, setRegionStats] = useState(initialRegionStats)
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [selectedClassYear, setSelectedClassYear] = useState<string>('all')
  const [isUpdating, setIsUpdating] = useState(false)
  const { openAthletePanel } = useAthletePanel()
  const supabase = createClient()

  // Filter athletes based on selected region and class year
  const filteredAthletes = athletes.filter(a => {
    const regionMatch = selectedRegion === 'all' || a.region === selectedRegion || (selectedRegion === 'Unassigned' && !a.region)
    const classYearMatch = selectedClassYear === 'all' || a.class_year === selectedClassYear
    return regionMatch && classYearMatch
  })

  // Group filtered athletes by status
  const columnGroups = OUTREACH_COLUMNS.map(column => ({
    ...column,
    athletes: filteredAthletes.filter(a => a.outreach_status === column.key),
  }))

  // Get unique regions from athletes
  const allRegions = ['all', ...REGIONS, 'Unassigned']

  const handleStatusChange = async (athleteId: string, newStatus: OutreachStatus) => {
    setIsUpdating(true)

    // Optimistic update
    setAthletes(prev => prev.map(a =>
      a.id === athleteId
        ? { ...a, outreach_status: newStatus, last_contacted_date: newStatus !== 'not_contacted' ? new Date().toISOString().split('T')[0] : a.last_contacted_date }
        : a
    ))

    // Update region stats
    const athlete = athletes.find(a => a.id === athleteId)
    if (athlete) {
      const oldStatus = athlete.outreach_status
      const region = athlete.region || 'Unassigned'

      setRegionStats(prev => prev.map(stat => {
        if (stat.region === region) {
          let newContacted = stat.contacted
          // If moving from not_contacted to something else, increment
          if (oldStatus === 'not_contacted' && newStatus !== 'not_contacted') {
            newContacted++
          }
          // If moving to not_contacted from something else, decrement
          if (oldStatus !== 'not_contacted' && newStatus === 'not_contacted') {
            newContacted--
          }
          return {
            ...stat,
            contacted: newContacted,
            percentage: stat.total > 0 ? Math.round((newContacted / stat.total) * 100) : 0,
          }
        }
        return stat
      }))
    }

    // Persist to database
    const updateData: { outreach_status: OutreachStatus; last_contacted_date?: string } = {
      outreach_status: newStatus,
    }

    // Set last_contacted_date when moving away from not_contacted
    if (newStatus !== 'not_contacted' && athlete?.outreach_status === 'not_contacted') {
      updateData.last_contacted_date = new Date().toISOString().split('T')[0]
    }

    await supabase
      .from('athletes')
      .update(updateData)
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
        <Link href="/athletes/new" className="btn-primary text-sm">
          <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden md:inline">Add Prospect</span>
        </Link>
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
            <div className="flex flex-wrap gap-3 mb-4">
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
              <div className="flex items-end">
                <p className="text-sm text-gray-500">
                  Showing {filteredAthletes.length} of {totalProspects} prospects
                </p>
              </div>
            </div>

            {/* Kanban Board */}
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
    </div>
  )
}
