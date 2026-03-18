'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { BrandOutreach } from '@/lib/database.types'
import { ExportButtons } from '@/components/export/export-buttons'

interface BrandOutreachWithRelations extends BrandOutreach {
  athletes: { id: string; name: string } | null
  users: { id: string; name: string } | null
}

interface BrandsClientProps {
  outreach: BrandOutreachWithRelations[] | null
}

type SortColumn = 'brand' | 'athlete' | 'method' | 'status' | 'value' | 'date' | 'staff'
type SortDirection = 'asc' | 'desc'

const brandExportColumns = [
  { key: 'brand_name' as const, header: 'Brand Name' },
  { key: 'brand_contact_name' as const, header: 'Contact Name' },
  { key: 'brand_contact_email' as const, header: 'Contact Email' },
  { key: 'date_contacted' as const, header: 'Date Contacted' },
  { key: 'outreach_method' as const, header: 'Method' },
  { key: 'response_status' as const, header: 'Status' },
  { key: 'deal_value' as const, header: 'Deal Value' },
  { key: 'product_value' as const, header: 'Product Value' },
  { key: 'campaign_details' as const, header: 'Campaign Details' },
  { key: 'follow_up_date' as const, header: 'Follow-up Date' },
  { key: 'notes' as const, header: 'Notes' },
]

export function BrandsClient({ outreach }: BrandsClientProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedOutreach = useMemo(() => {
    if (!outreach) return []
    return [...outreach].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortColumn) {
        case 'brand':
          aVal = a.brand_name.toLowerCase()
          bVal = b.brand_name.toLowerCase()
          break
        case 'athlete':
          aVal = (a.athletes?.name || '').toLowerCase()
          bVal = (b.athletes?.name || '').toLowerCase()
          break
        case 'method':
          aVal = a.outreach_method
          bVal = b.outreach_method
          break
        case 'status':
          aVal = a.response_status
          bVal = b.response_status
          break
        case 'value':
          aVal = a.deal_value || 0
          bVal = b.deal_value || 0
          break
        case 'date':
          aVal = new Date(a.date_contacted).getTime()
          bVal = new Date(b.date_contacted).getTime()
          break
        case 'staff':
          aVal = (a.users?.name || '').toLowerCase()
          bVal = (b.users?.name || '').toLowerCase()
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [outreach, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => (
    sortColumn === column ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : null
  )

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      no_response: 'badge-gray',
      interested: 'badge-blue',
      not_interested: 'badge-red',
      in_discussion: 'badge-yellow',
      deal_closed: 'badge-green',
    }
    return statusClasses[status] || 'badge-gray'
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Flatten data for export
  const exportData = outreach?.map(item => ({
    ...item,
    athlete_name: item.athletes?.name || '',
    staff_name: item.users?.name || '',
  })) || []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Outreach</h1>
          <p className="text-gray-500 text-sm">Track brand partnerships and sponsorship deals</p>
        </div>
        <div className="flex items-center gap-3">
          {outreach && outreach.length > 0 && (
            <ExportButtons
              data={exportData}
              filename="brand-outreach"
              columns={[
                ...brandExportColumns,
                { key: 'athlete_name' as const, header: 'Athlete' },
                { key: 'staff_name' as const, header: 'Staff Member' },
              ]}
              sheetName="Brand Outreach"
            />
          )}
          <Link href="/brands/new" className="btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Outreach
          </Link>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
      {outreach && outreach.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => handleSort('brand')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Brand <SortIcon column="brand" /></div>
                </th>
                <th onClick={() => handleSort('athlete')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Athlete <SortIcon column="athlete" /></div>
                </th>
                <th onClick={() => handleSort('method')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Method <SortIcon column="method" /></div>
                </th>
                <th onClick={() => handleSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                </th>
                <th onClick={() => handleSort('value')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Deal Value <SortIcon column="value" /></div>
                </th>
                <th onClick={() => handleSort('date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Date <SortIcon column="date" /></div>
                </th>
                <th onClick={() => handleSort('staff')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Staff <SortIcon column="staff" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedOutreach.map((item) => (
                <tr key={item.id} className="table-row-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.brand_name}</div>
                    {item.brand_contact_name && (
                      <div className="text-sm text-gray-500">{item.brand_contact_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/athletes/${item.athlete_id}`}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      {item.athletes?.name ?? 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {item.outreach_method}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(item.response_status)}>
                      {item.response_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(item.deal_value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.date_contacted).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.users?.name ?? 'Unknown'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="empty-state-title">Start landing deals</p>
            <p className="empty-state-description">No brand outreach recorded yet. Begin connecting your athletes with brands to unlock NIL opportunities.</p>
            <Link href="/brands/new" className="btn-primary mt-4 inline-flex">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Log First Outreach
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
