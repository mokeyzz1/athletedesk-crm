'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AthleteWithPipeline } from '@/lib/database.types'
import { AthleteImportModal } from '@/components/import/athlete-import-modal'
import { ExportButtons } from '@/components/export/export-buttons'
import { type SocialMediaData, calculateTotalFollowing, formatFollowerCount } from '@/lib/sport-fields'

interface AthletesClientProps {
  athletes: AthleteWithPipeline[] | null
}

const athleteExportColumns = [
  { key: 'name' as const, header: 'Name' },
  { key: 'email' as const, header: 'Email' },
  { key: 'phone' as const, header: 'Phone' },
  { key: 'school' as const, header: 'School' },
  { key: 'sport' as const, header: 'Sport' },
  { key: 'position' as const, header: 'Position' },
  { key: 'league_level' as const, header: 'League Level' },
  { key: 'eligibility_year' as const, header: 'Eligibility Year' },
  { key: 'recruiting_status' as const, header: 'Recruiting Status' },
  { key: 'transfer_portal_status' as const, header: 'Transfer Portal Status' },
  { key: 'marketability_score' as const, header: 'Marketability Score' },
  { key: 'pipeline_stage' as const, header: 'Pipeline Stage' },
  { key: 'priority' as const, header: 'Priority' },
  { key: 'scout_name' as const, header: 'Scout' },
  { key: 'agent_name' as const, header: 'Agent' },
  { key: 'instagram_handle' as const, header: 'Instagram' },
  { key: 'instagram_followers' as const, header: 'Instagram Followers' },
  { key: 'twitter_handle' as const, header: 'Twitter/X' },
  { key: 'twitter_followers' as const, header: 'Twitter Followers' },
  { key: 'tiktok_handle' as const, header: 'TikTok' },
  { key: 'tiktok_followers' as const, header: 'TikTok Followers' },
  { key: 'youtube_channel' as const, header: 'YouTube' },
  { key: 'youtube_subscribers' as const, header: 'YouTube Subscribers' },
  { key: 'total_following' as const, header: 'Total Social Following' },
  { key: 'nil_valuation' as const, header: 'NIL Valuation' },
  { key: 'notes' as const, header: 'Notes' },
]

type SortColumn = 'name' | 'sport' | 'school' | 'status' | 'pipeline' | 'priority' | 'social' | 'marketability'
type SortDirection = 'asc' | 'desc'

export function AthletesClient({ athletes }: AthletesClientProps) {
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pipelineFilter, setPipelineFilter] = useState('')
  const [portalFilter, setPortalFilter] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const router = useRouter()

  // Get unique values for filters
  const sports = useMemo(() => {
    const uniqueSports = new Set(athletes?.map(a => a.sport) || [])
    return Array.from(uniqueSports).sort()
  }, [athletes])

  const statuses = [
    { value: 'not_recruiting', label: 'Not Recruiting' },
    { value: 'open_to_contact', label: 'Open to Contact' },
    { value: 'actively_recruiting', label: 'Actively Recruiting' },
    { value: 'committed', label: 'Committed' },
    { value: 'signed', label: 'Signed' },
  ]

  const pipelineStages = [
    { value: 'prospect_identified', label: 'Prospect Identified' },
    { value: 'scout_evaluation', label: 'Scout Evaluation' },
    { value: 'initial_contact', label: 'Initial Contact' },
    { value: 'recruiting_conversation', label: 'Recruiting' },
    { value: 'interested', label: 'Interested' },
    { value: 'signing_in_progress', label: 'Signing' },
    { value: 'signed_client', label: 'Signed Client' },
  ]

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

      // Status filter
      if (statusFilter && athlete.recruiting_status !== statusFilter) return false

      // Pipeline filter
      if (pipelineFilter) {
        if (pipelineFilter === 'not_in_pipeline' && athlete.pipeline_stage) return false
        if (pipelineFilter !== 'not_in_pipeline' && athlete.pipeline_stage !== pipelineFilter) return false
      }

      // Portal filter
      if (portalFilter) {
        if (portalFilter === 'in_portal' && athlete.transfer_portal_status === 'not_in_portal') return false
        if (portalFilter === 'not_in_portal' && athlete.transfer_portal_status !== 'not_in_portal') return false
      }

      return true
    })

    // Sort
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }

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
        case 'status':
          aVal = a.recruiting_status
          bVal = b.recruiting_status
          break
        case 'pipeline':
          aVal = a.pipeline_stage || ''
          bVal = b.pipeline_stage || ''
          break
        case 'priority':
          aVal = priorityOrder[a.priority || ''] || 0
          bVal = priorityOrder[b.priority || ''] || 0
          break
        case 'social':
          const aSocial = a.social_media as SocialMediaData | null
          const bSocial = b.social_media as SocialMediaData | null
          aVal = aSocial ? calculateTotalFollowing(aSocial) : 0
          bVal = bSocial ? calculateTotalFollowing(bSocial) : 0
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
  }, [athletes, searchQuery, sportFilter, statusFilter, pipelineFilter, portalFilter, sortColumn, sortDirection])

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
    setStatusFilter('')
    setPipelineFilter('')
    setPortalFilter('')
  }

  const hasActiveFilters = searchQuery || sportFilter || statusFilter || pipelineFilter || portalFilter

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      not_recruiting: 'badge-gray',
      open_to_contact: 'badge-blue',
      actively_recruiting: 'badge-green',
      committed: 'badge-yellow',
      signed: 'badge-green',
    }
    return statusClasses[status] || 'badge-gray'
  }

  const getPriorityBadge = (priority: string): string => {
    const priorityClasses: Record<string, string> = {
      high: 'badge-red',
      medium: 'badge-yellow',
      low: 'badge-gray',
    }
    return priorityClasses[priority] || 'badge-gray'
  }

  const handleImportSuccess = () => {
    router.refresh()
  }

  // Flatten data for export including social media fields
  const exportData = athletes?.map(athlete => {
    const socialMedia = athlete.social_media as SocialMediaData | null
    return {
      ...athlete,
      instagram_handle: socialMedia?.instagram_handle || '',
      instagram_followers: socialMedia?.instagram_followers || '',
      twitter_handle: socialMedia?.twitter_handle || '',
      twitter_followers: socialMedia?.twitter_followers || '',
      tiktok_handle: socialMedia?.tiktok_handle || '',
      tiktok_followers: socialMedia?.tiktok_followers || '',
      youtube_channel: socialMedia?.youtube_channel || '',
      youtube_subscribers: socialMedia?.youtube_subscribers || '',
      total_following: socialMedia ? calculateTotalFollowing(socialMedia) : '',
      nil_valuation: socialMedia?.nil_valuation || '',
    }
  }) || []

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Athletes</h1>
            <p className="text-gray-600">
              {filteredAthletes.length} of {athletes?.length || 0} athletes
              {hasActiveFilters && ' (filtered)'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {athletes && athletes.length > 0 && (
              <ExportButtons
                data={exportData}
                filename="athletes"
                columns={athleteExportColumns}
                sheetName="Athletes"
              />
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </button>
            <Link href="/athletes/new" className="btn-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Athlete
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card p-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
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
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="input py-1.5 text-sm w-[120px]"
            >
              <option value="">All Sports</option>
              {sports.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input py-1.5 text-sm w-[130px]"
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            <select
              value={pipelineFilter}
              onChange={(e) => setPipelineFilter(e.target.value)}
              className="input py-1.5 text-sm w-[140px]"
            >
              <option value="">All Stages</option>
              <option value="not_in_pipeline">Not in Pipeline</option>
              {pipelineStages.map(stage => (
                <option key={stage.value} value={stage.value}>{stage.label}</option>
              ))}
            </select>

            <select
              value={portalFilter}
              onChange={(e) => setPortalFilter(e.target.value)}
              className="input py-1.5 text-sm w-[120px]"
            >
              <option value="">Portal</option>
              <option value="in_portal">In Portal</option>
              <option value="not_in_portal">Not in Portal</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
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
                        onClick={() => handleSort('status')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Status
                          {sortColumn === 'status' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('pipeline')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Pipeline
                          {sortColumn === 'pipeline' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('priority')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Priority
                          {sortColumn === 'priority' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('social')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Social
                          {sortColumn === 'social' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('marketability')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Marketability
                          {sortColumn === 'marketability' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAthletes.map((athlete) => {
                      const socialMedia = athlete.social_media as SocialMediaData | null
                      const totalFollowing = socialMedia ? calculateTotalFollowing(socialMedia) : 0

                      return (
                        <tr key={athlete.id} className="table-row-hover">
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
                            <span className={getStatusBadge(athlete.recruiting_status)}>
                              {athlete.recruiting_status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {athlete.pipeline_stage ? (
                              <span className="text-sm text-gray-900 capitalize">
                                {athlete.pipeline_stage.replace(/_/g, ' ')}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {athlete.priority ? (
                              <span className={getPriorityBadge(athlete.priority)}>
                                {athlete.priority}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {totalFollowing > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-1">
                                  {socialMedia?.instagram_handle && (
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
                                      </svg>
                                    </div>
                                  )}
                                  {socialMedia?.twitter_handle && (
                                    <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z"/>
                                      </svg>
                                    </div>
                                  )}
                                  {socialMedia?.tiktok_handle && (
                                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64z"/>
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {formatFollowerCount(totalFollowing)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {athlete.marketability_score !== null ? (
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className="bg-brand-600 h-2 rounded-full"
                                    style={{ width: `${athlete.marketability_score}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600">{athlete.marketability_score}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/athletes/${athlete.id}`}
                              className="text-brand-600 hover:text-brand-900"
                            >
                              View
                            </Link>
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
                <p className="empty-state-description">Try adjusting your search or filters to find what you&apos;re looking for.</p>
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
              <p className="empty-state-title">Build your roster</p>
              <p className="empty-state-description">You haven&apos;t added any athletes yet. Import from a spreadsheet or add your first prospect manually.</p>
              <div className="mt-4 flex justify-center gap-3">
                <button onClick={() => setShowImportModal(true)} className="btn-secondary">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Spreadsheet
                </button>
                <Link href="/athletes/new" className="btn-primary">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Manually
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <AthleteImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </>
  )
}
