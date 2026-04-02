'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExportButtons } from '@/components/export/export-buttons'
import { AthleteImportModal } from '@/components/import/athlete-import-modal'

import type { RosterAthlete } from './page'

interface RosterClientProps {
  athletes: RosterAthlete[]
}

type SortColumn = 'name' | 'sport' | 'school' | 'agent' | 'deals' | 'revenue_share' | 'marketing_brand' | 'reach'
type SortDirection = 'asc' | 'desc'

export function RosterClient({ athletes }: RosterClientProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [sportFilter, setSportFilter] = useState<string>('')
  const [showImportModal, setShowImportModal] = useState(false)
  const router = useRouter()

  const handleImportSuccess = () => {
    router.refresh()
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const calculateSocialReach = (socialMedia: RosterAthlete['social_media']) => {
    if (!socialMedia) return 0
    return (
      (socialMedia.instagram_followers || 0) +
      (socialMedia.twitter_followers || 0) +
      (socialMedia.tiktok_followers || 0) +
      (socialMedia.youtube_subscribers || 0)
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatCurrency = (value: number) => {
    if (!value) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Get unique sports for filter
  const sports = useMemo(() => {
    const uniqueSports = Array.from(new Set(athletes.map(a => a.sport)))
    return uniqueSports.sort()
  }, [athletes])

  const filteredAndSortedAthletes = useMemo(() => {
    let filtered = athletes
    if (sportFilter) {
      filtered = athletes.filter(a => a.sport === sportFilter)
    }

    return [...filtered].sort((a, b) => {
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
        case 'agent':
          aVal = (a.agent_name || '').toLowerCase()
          bVal = (b.agent_name || '').toLowerCase()
          break
        case 'deals':
          aVal = a.total_deal_value
          bVal = b.total_deal_value
          break
        case 'revenue_share':
          aVal = a.revenue_share_total
          bVal = b.revenue_share_total
          break
        case 'marketing_brand':
          aVal = a.marketing_brand_total
          bVal = b.marketing_brand_total
          break
        case 'reach':
          aVal = calculateSocialReach(a.social_media)
          bVal = calculateSocialReach(b.social_media)
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [athletes, sportFilter, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => (
    sortColumn === column ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : null
  )

  // Calculate totals
  const totalDealValue = athletes.reduce((sum, a) => sum + a.total_deal_value, 0)
  const totalRevenueShare = athletes.reduce((sum, a) => sum + a.revenue_share_total, 0)
  const totalMarketingBrand = athletes.reduce((sum, a) => sum + a.marketing_brand_total, 0)
  const totalReach = athletes.reduce((sum, a) => sum + calculateSocialReach(a.social_media), 0)

  // Export data
  const exportData = athletes.map(a => ({
    name: a.name,
    sport: a.sport,
    school: a.school || '',
    position: a.position || '',
    agent: a.agent_name || '',
    revenue_share: formatCurrency(a.revenue_share_total),
    revenue_share_count: a.revenue_share_count,
    marketing_brand: formatCurrency(a.marketing_brand_total),
    marketing_brand_count: a.marketing_brand_count,
    total_deals: formatCurrency(a.total_deal_value),
    deal_count: a.deal_count,
    social_reach: calculateSocialReach(a.social_media),
    nil_valuation: a.social_media?.nil_valuation || '',
  }))

  const exportColumns = [
    { key: 'name' as const, header: 'Name' },
    { key: 'sport' as const, header: 'Sport' },
    { key: 'school' as const, header: 'School' },
    { key: 'position' as const, header: 'Position' },
    { key: 'agent' as const, header: 'Agent' },
    { key: 'revenue_share' as const, header: 'Revenue Share Value' },
    { key: 'revenue_share_count' as const, header: 'Revenue Share Deals' },
    { key: 'marketing_brand' as const, header: 'Marketing/Brand Value' },
    { key: 'marketing_brand_count' as const, header: 'Marketing/Brand Deals' },
    { key: 'total_deals' as const, header: 'Total Deal Value' },
    { key: 'deal_count' as const, header: 'Total Deal Count' },
    { key: 'social_reach' as const, header: 'Social Reach' },
    { key: 'nil_valuation' as const, header: 'NIL Valuation' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roster</h1>
          <p className="text-gray-500 text-sm">Signed athletes under management</p>
        </div>
        <div className="flex items-center gap-3">
          {athletes.length > 0 && (
            <ExportButtons
              data={exportData}
              filename="roster"
              columns={exportColumns}
              sheetName="Roster"
            />
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary text-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Roster
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {athletes.length > 0 ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="card text-center">
                <p className="text-3xl font-bold text-gray-900">{athletes.length}</p>
                <p className="text-sm text-gray-500">Signed Athletes</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(totalRevenueShare)}</p>
                <p className="text-sm text-gray-500">Revenue Share / Scholarship</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-green-600">{formatCurrency(totalMarketingBrand)}</p>
                <p className="text-sm text-gray-500">Marketing / Brand Deals</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-blue-600">{formatNumber(totalReach)}</p>
                <p className="text-sm text-gray-500">Social Reach</p>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 flex items-center gap-4">
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="input w-48"
              >
                <option value="">All Sports</option>
                {sports.map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
              {sportFilter && (
                <button
                  onClick={() => setSportFilter('')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                      <div className="flex items-center gap-1">Athlete <SortIcon column="name" /></div>
                    </th>
                    <th onClick={() => handleSort('sport')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                      <div className="flex items-center gap-1">Sport <SortIcon column="sport" /></div>
                    </th>
                    <th onClick={() => handleSort('school')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                      <div className="flex items-center gap-1">School <SortIcon column="school" /></div>
                    </th>
                    <th onClick={() => handleSort('agent')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                      <div className="flex items-center gap-1">Agent <SortIcon column="agent" /></div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Emails
                    </th>
                    <th onClick={() => handleSort('revenue_share')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                      <div className="flex items-center gap-1">Revenue Share <SortIcon column="revenue_share" /></div>
                    </th>
                    <th onClick={() => handleSort('marketing_brand')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                      <div className="flex items-center gap-1">Marketing/Brand <SortIcon column="marketing_brand" /></div>
                    </th>
                    <th onClick={() => handleSort('reach')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                      <div className="flex items-center gap-1">Social Reach <SortIcon column="reach" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedAthletes.map((athlete) => {
                    const socialReach = calculateSocialReach(athlete.social_media)
                    return (
                      <tr key={athlete.id} className="table-row-hover">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/athletes/${athlete.id}`}
                            className="text-sm font-medium text-brand-600 hover:text-brand-700"
                          >
                            {athlete.name}
                          </Link>
                          {athlete.position && (
                            <p className="text-xs text-gray-500">{athlete.position}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="badge-blue">{athlete.sport}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {athlete.school || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {athlete.agent_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{athlete.emailCount}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-purple-700">
                            {athlete.revenue_share_total > 0 ? formatCurrency(athlete.revenue_share_total) : '-'}
                          </div>
                          {athlete.revenue_share_count > 0 && (
                            <div className="text-xs text-gray-500">
                              {athlete.revenue_share_count} deal{athlete.revenue_share_count > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-green-700">
                            {athlete.marketing_brand_total > 0 ? formatCurrency(athlete.marketing_brand_total) : '-'}
                          </div>
                          {athlete.marketing_brand_count > 0 && (
                            <div className="text-xs text-gray-500">
                              {athlete.marketing_brand_count} deal{athlete.marketing_brand_count > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {socialReach > 0 ? formatNumber(socialReach) : '-'}
                          </div>
                          {athlete.social_media?.nil_valuation && (
                            <div className="text-xs text-gray-500">
                              NIL: {formatCurrency(athlete.social_media.nil_valuation)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="card">
            <div className="empty-state">
              <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="empty-state-title">No signed athletes yet</p>
              <p className="empty-state-description">
                Athletes will appear here once they are signed. Use the Pipeline to track and sign new athletes.
              </p>
              <Link href="/pipeline" className="btn-primary mt-4 inline-flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Pipeline
              </Link>
            </div>
          </div>
        )}
      </div>

      <AthleteImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        pipelineStage="signed_client"
        title="Import Roster"
      />
    </div>
  )
}
