'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { FinancialTracking } from '@/lib/database.types'
import { ExportButtons } from '@/components/export/export-buttons'

interface FinancialWithAthlete extends FinancialTracking {
  athletes: { id: string; name: string } | null
}

interface FinancialsClientProps {
  financials: FinancialWithAthlete[] | null
}

type SortColumn = 'deal' | 'athlete' | 'value' | 'percentage' | 'fee' | 'payout' | 'status' | 'date'
type SortDirection = 'asc' | 'desc'

export function FinancialsClient({ financials }: FinancialsClientProps) {
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

  const sortedFinancials = useMemo(() => {
    if (!financials) return []
    return [...financials].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortColumn) {
        case 'deal':
          aVal = a.deal_name.toLowerCase()
          bVal = b.deal_name.toLowerCase()
          break
        case 'athlete':
          aVal = (a.athletes?.name || '').toLowerCase()
          bVal = (b.athletes?.name || '').toLowerCase()
          break
        case 'value':
          aVal = Number(a.deal_value)
          bVal = Number(b.deal_value)
          break
        case 'percentage':
          aVal = a.agency_percentage
          bVal = b.agency_percentage
          break
        case 'fee':
          aVal = Number(a.agency_fee)
          bVal = Number(b.agency_fee)
          break
        case 'payout':
          aVal = Number(a.athlete_payout)
          bVal = Number(b.athlete_payout)
          break
        case 'status':
          aVal = a.payment_status
          bVal = b.payment_status
          break
        case 'date':
          aVal = new Date(a.deal_date).getTime()
          bVal = new Date(b.deal_date).getTime()
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [financials, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => (
    sortColumn === column ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : null
  )
  // Calculate totals
  const totals = {
    totalDeals: financials?.length ?? 0,
    totalValue: financials?.reduce((sum, f) => sum + Number(f.deal_value), 0) ?? 0,
    totalAgencyFee: financials?.reduce((sum, f) => sum + Number(f.agency_fee), 0) ?? 0,
    pendingPayments: financials?.filter(f => f.payment_status === 'pending').length ?? 0,
  }

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      pending: 'badge-yellow',
      invoiced: 'badge-blue',
      paid: 'badge-green',
    }
    return statusClasses[status] || 'badge-gray'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Flatten data for export
  const exportData = financials?.map(item => ({
    ...item,
    athlete_name: item.athletes?.name || '',
  })) || []

  const financialExportColumns = [
    { key: 'deal_name' as const, header: 'Deal Name' },
    { key: 'athlete_name' as const, header: 'Athlete' },
    { key: 'deal_value' as const, header: 'Deal Value' },
    { key: 'agency_percentage' as const, header: 'Agency %' },
    { key: 'agency_fee' as const, header: 'Agency Fee' },
    { key: 'athlete_payout' as const, header: 'Athlete Payout' },
    { key: 'payment_status' as const, header: 'Payment Status' },
    { key: 'deal_date' as const, header: 'Deal Date' },
    { key: 'invoice_date' as const, header: 'Invoice Date' },
    { key: 'payment_date' as const, header: 'Payment Date' },
    { key: 'notes' as const, header: 'Notes' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Tracking</h1>
          <p className="text-gray-600">Manage deals, commissions, and payments</p>
        </div>
        <div className="flex items-center gap-3">
          {financials && financials.length > 0 && (
            <ExportButtons
              data={exportData}
              filename="financials"
              columns={financialExportColumns}
              sheetName="Financials"
            />
          )}
          <Link href="/financials/new" className="btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Deal
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card">
          <p className="text-sm font-medium text-gray-600">Total Deals</p>
          <p className="stat-value">{totals.totalDeals}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-gray-600">Total Deal Value</p>
          <p className="stat-value">{formatCurrency(totals.totalValue)}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-gray-600">Agency Revenue</p>
          <p className="text-[32px] font-bold text-green-600 mt-2">{formatCurrency(totals.totalAgencyFee)}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-gray-600">Pending Payments</p>
          <p className="text-[32px] font-bold text-yellow-600 mt-2">{totals.pendingPayments}</p>
        </div>
      </div>

      {/* Deals Table */}
      {financials && financials.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => handleSort('deal')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Deal <SortIcon column="deal" /></div>
                </th>
                <th onClick={() => handleSort('athlete')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Athlete <SortIcon column="athlete" /></div>
                </th>
                <th onClick={() => handleSort('value')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Deal Value <SortIcon column="value" /></div>
                </th>
                <th onClick={() => handleSort('percentage')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Agency % <SortIcon column="percentage" /></div>
                </th>
                <th onClick={() => handleSort('fee')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Agency Fee <SortIcon column="fee" /></div>
                </th>
                <th onClick={() => handleSort('payout')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Athlete Payout <SortIcon column="payout" /></div>
                </th>
                <th onClick={() => handleSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                </th>
                <th onClick={() => handleSort('date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Date <SortIcon column="date" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedFinancials.map((deal) => (
                <tr key={deal.id} className="table-row-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{deal.deal_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/athletes/${deal.athlete_id}`}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      {deal.athletes?.name ?? 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(Number(deal.deal_value))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {deal.agency_percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {formatCurrency(Number(deal.agency_fee))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(Number(deal.athlete_payout))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(deal.payment_status)}>
                      {deal.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(deal.deal_date).toLocaleDateString()}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="empty-state-title">Track your earnings</p>
            <p className="empty-state-description">No deals recorded yet. When you close brand partnerships, add them here to track revenue and commissions.</p>
            <Link href="/financials/new" className="btn-primary mt-4 inline-flex">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Record First Deal
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
