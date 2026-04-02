'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AthleteImportModal } from '@/components/import/athlete-import-modal'
import { ExportButtons } from '@/components/export/export-buttons'
import { useAthletePanel } from '@/contexts/athlete-panel-context'
import { OUTREACH_STATUSES, CLASS_YEARS } from '@/lib/database.types'
import type { AllAthlete } from './page'
import type { OutreachStatus } from '@/lib/database.types'

interface AthletesClientProps {
  athletes: AllAthlete[]
}

const STATUS_COLORS: Record<OutreachStatus, string> = {
  'not_contacted': 'bg-gray-100 text-gray-700',
  'contacted': 'bg-blue-100 text-blue-700',
  'in_conversation': 'bg-indigo-100 text-indigo-700',
  'interested': 'bg-yellow-100 text-yellow-700',
  'committed': 'bg-green-100 text-green-700',
  'circling_back': 'bg-orange-100 text-orange-700',
  'dead_lead': 'bg-red-100 text-red-700',
  'signed': 'bg-emerald-100 text-emerald-700',
}

const athleteExportColumns = [
  { key: 'name' as const, header: 'Name' },
  { key: 'email' as const, header: 'Email' },
  { key: 'phone' as const, header: 'Phone' },
  { key: 'school' as const, header: 'School' },
  { key: 'sport' as const, header: 'Sport' },
  { key: 'position' as const, header: 'Position' },
  { key: 'class_year' as const, header: 'Class Year' },
  { key: 'region' as const, header: 'Region' },
  { key: 'outreach_status' as const, header: 'Status' },
  { key: 'marketability_score' as const, header: 'Marketability Score' },
]

type SortColumn = 'name' | 'sport' | 'school' | 'class_year' | 'region' | 'outreach_status' | 'marketability'
type SortDirection = 'asc' | 'desc'
type GroupFilter = 'all' | 'recruiting' | 'roster'

export function AthletesClient({ athletes: initialAthletes }: AthletesClientProps) {
  const [athletes] = useState(initialAthletes)
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const router = useRouter()
  const { openAthletePanel } = useAthletePanel()

  // Get unique values for filters
  const sports = useMemo(() => {
    const uniqueSports = new Set(athletes?.map(a => a.sport) || [])
    return Array.from(uniqueSports).sort()
  }, [athletes])

  // Filter and sort athletes
  const filteredAthletes = useMemo(() => {
    if (!athletes) return []

    const filtered = athletes.filter(athlete => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          athlete.name.toLowerCase().includes(query) ||
          athlete.email?.toLowerCase().includes(query) ||
          athlete.school?.toLowerCase().includes(query) ||
          athlete.sport.toLowerCase().includes(query) ||
          athlete.position?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Sport filter
      if (sportFilter && athlete.sport !== sportFilter) return false

      // Group filter (recruiting vs roster)
      if (groupFilter === 'recruiting' && athlete.outreach_status === 'signed') return false
      if (groupFilter === 'roster' && athlete.outreach_status !== 'signed') return false

      // Status filter
      if (statusFilter && athlete.outreach_status !== statusFilter) return false

      return true
    })

    // Sort
    return filtered.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortColumn) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'sport':
          aVal = a.sport.toLowerCase()
          bVal = b.sport.toLowerCase()
          break
        case 'school':
          aVal = (a.school || '').toLowerCase()
          bVal = (b.school || '').toLowerCase()
          break
        case 'class_year':
          aVal = a.class_year || ''
          bVal = b.class_year || ''
          break
        case 'region':
          aVal = (a.region || '').toLowerCase()
          bVal = (b.region || '').toLowerCase()
          break
        case 'outreach_status':
          aVal = a.outreach_status
          bVal = b.outreach_status
          break
        case 'marketability':
          aVal = a.marketability_score || 0
          bVal = b.marketability_score || 0
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [athletes, searchQuery, sportFilter, groupFilter, statusFilter, sortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSportFilter('')
    setGroupFilter('all')
    setStatusFilter('')
  }

  const hasActiveFilters = searchQuery || sportFilter || groupFilter !== 'all' || statusFilter

  const handleImportSuccess = () => {
    router.refresh()
  }

  // Stats
  const recruitingCount = athletes.filter(a => a.outreach_status !== 'signed').length
  const rosterCount = athletes.filter(a => a.outreach_status === 'signed').length

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 min-h-[64px] md:h-[92px] flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-0 bg-gray-50 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">All Athletes</h1>
              <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">Admin</span>
            </div>
            <p className="text-gray-500 text-sm">
              {recruitingCount} recruiting · {rosterCount} signed
              {hasActiveFilters && ` · Showing ${filteredAthletes.length} filtered`}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {athletes && athletes.length > 0 && (
              <div className="hidden sm:block">
                <ExportButtons
                  data={athletes as unknown as Record<string, unknown>[]}
                  filename="all-athletes"
                  columns={athleteExportColumns as { key: string; header: string }[]}
                  sheetName="Athletes"
                />
              </div>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary text-sm"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden md:inline">Import</span>
            </button>
            <Link href="/athletes/new" className="btn-primary text-sm">
              <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden md:inline">Add Athlete</span>
            </Link>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
          {/* Search and Filters */}
          <div className="card p-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search athletes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-8 py-1.5 text-sm w-full"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value as GroupFilter)}
                  className="input py-1.5 text-sm min-w-[100px]"
                >
                  <option value="all">All Athletes</option>
                  <option value="recruiting">Recruiting ({recruitingCount})</option>
                  <option value="roster">Roster ({rosterCount})</option>
                </select>

                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="input py-1.5 text-sm min-w-[100px]"
                >
                  <option value="">All Sports</option>
                  {sports.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input py-1.5 text-sm min-w-[100px]"
                >
                  <option value="">All Statuses</option>
                  {OUTREACH_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {athletes && athletes.length > 0 ? (
            filteredAthletes.length > 0 ? (
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          onClick={() => handleSort('name')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Athlete
                            {sortColumn === 'name' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('sport')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Sport
                            {sortColumn === 'sport' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('school')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        >
                          <div className="flex items-center gap-1">
                            School
                            {sortColumn === 'school' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('class_year')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Class
                            {sortColumn === 'class_year' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('region')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Region
                            {sortColumn === 'region' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('outreach_status')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Status
                            {sortColumn === 'outreach_status' && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                              </svg>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Group
                        </th>
                        <th className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAthletes.map((athlete) => {
                        const isSigned = athlete.outreach_status === 'signed'
                        const statusLabel = OUTREACH_STATUSES.find(s => s.value === athlete.outreach_status)?.label || athlete.outreach_status

                        return (
                          <tr
                            key={athlete.id}
                            className="table-row-hover cursor-pointer"
                            onClick={() => openAthletePanel(athlete.id)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                                  <span className="text-brand-600 font-medium">
                                    {athlete.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{athlete.name}</div>
                                  {athlete.email && (
                                    <div className="text-sm text-gray-500">{athlete.email}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{athlete.sport}</div>
                              {athlete.position && (
                                <div className="text-sm text-gray-500">{athlete.position}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {athlete.school || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-medium">
                                {CLASS_YEARS.find(c => c.value === athlete.class_year)?.label || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {athlete.region || <span className="text-gray-400">Unassigned</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[athlete.outreach_status]}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isSigned ? (
                                <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                                  Roster
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                                  Recruiting
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  onClick={() => openAthletePanel(athlete.id)}
                                  className="text-brand-600 hover:text-brand-900"
                                >
                                  Edit
                                </button>
                                <Link
                                  href={`/athletes/${athlete.id}`}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  View
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="empty-state-title">No matching athletes</p>
                  <p className="empty-state-description">Try adjusting your search or filters.</p>
                  <button onClick={clearFilters} className="btn-secondary mt-4">
                    Clear All Filters
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="card">
              <div className="empty-state">
                <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <p className="empty-state-title">No athletes yet</p>
                <p className="empty-state-description">Import from a spreadsheet or add your first athlete.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <button onClick={() => setShowImportModal(true)} className="btn-secondary">
                    Import Spreadsheet
                  </button>
                  <Link href="/athletes/new" className="btn-primary">
                    Add Manually
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AthleteImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        title="Import Athletes"
      />
    </>
  )
}
