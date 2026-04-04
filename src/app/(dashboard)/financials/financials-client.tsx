'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { FinancialTracking, Athlete, DealType, DealStage, PaymentStatus } from '@/lib/database.types'
import { DEAL_TYPES, DEAL_STAGES } from '@/lib/database.types'
import { ExportButtons } from '@/components/export/export-buttons'

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'paid', label: 'Paid' },
]

interface FinancialWithAthlete extends FinancialTracking {
  athletes: { id: string; name: string } | null
}

interface FinancialsClientProps {
  financials: FinancialWithAthlete[] | null
}

type SortColumn = 'deal' | 'athlete' | 'value' | 'percentage' | 'fee' | 'payout' | 'status' | 'date'
type SortDirection = 'asc' | 'desc'

export function FinancialsClient({ financials: initialFinancials }: FinancialsClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [financials, setFinancials] = useState(initialFinancials)
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Side panel state
  const [selectedDeal, setSelectedDeal] = useState<FinancialWithAthlete | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dealValue, setDealValue] = useState<number>(0)
  const [agencyPercentage, setAgencyPercentage] = useState<number>(15)

  // Fetch athletes when panel opens
  useEffect(() => {
    if (isPanelOpen && athletes.length === 0) {
      const fetchAthletes = async () => {
        const { data } = await supabase
          .from('athletes')
          .select('*')
          .order('outreach_status', { ascending: false })
          .order('name')
        if (data) setAthletes(data as Athlete[])
      }
      fetchAthletes()
    }
  }, [isPanelOpen, athletes.length, supabase])

  const openPanel = (deal: FinancialWithAthlete) => {
    setSelectedDeal(deal)
    setDealValue(Number(deal.deal_value))
    setAgencyPercentage(deal.agency_percentage)
    setError(null)
    setIsPanelOpen(true)
  }

  const closePanel = () => {
    setIsPanelOpen(false)
    setSelectedDeal(null)
    setShowDeleteConfirm(false)
    setError(null)
  }

  const agencyFee = (dealValue * agencyPercentage) / 100
  const athletePayout = dealValue - agencyFee

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedDeal) return

    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const dealValueNum = parseFloat(formData.get('deal_value') as string)
    const agencyPctNum = parseFloat(formData.get('agency_percentage') as string)

    if (dealValueNum < 0) {
      setError('Deal value cannot be negative')
      setIsSubmitting(false)
      return
    }
    if (agencyPctNum < 0 || agencyPctNum > 100) {
      setError('Agency percentage must be between 0 and 100')
      setIsSubmitting(false)
      return
    }

    const updateData = {
      athlete_id: formData.get('athlete_id') as string,
      deal_name: formData.get('deal_name') as string,
      deal_value: dealValueNum,
      agency_percentage: agencyPctNum,
      agency_fee: (dealValueNum * agencyPctNum) / 100,
      athlete_payout: dealValueNum - (dealValueNum * agencyPctNum) / 100,
      deal_type: formData.get('deal_type') as DealType,
      deal_stage: formData.get('deal_stage') as DealStage,
      deal_date: formData.get('deal_date') as string,
      payment_status: formData.get('payment_status') as PaymentStatus,
      invoice_date: (formData.get('invoice_date') as string) || null,
      payment_date: (formData.get('payment_date') as string) || null,
      notes: (formData.get('notes') as string) || null,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('financial_tracking')
      .update(updateData as never)
      .eq('id', selectedDeal.id)

    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
      return
    }

    // Update local state
    const athleteData = athletes.find(a => a.id === updateData.athlete_id)
    setFinancials(prev => prev?.map(f =>
      f.id === selectedDeal.id
        ? { ...f, ...updateData, athletes: athleteData ? { id: athleteData.id, name: athleteData.name } : f.athletes }
        : f
    ) || null)

    setIsSubmitting(false)
    closePanel()
  }

  const handleDelete = async () => {
    if (!selectedDeal) return

    setIsDeleting(true)
    const { error: deleteError } = await supabase
      .from('financial_tracking')
      .delete()
      .eq('id', selectedDeal.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsDeleting(false)
      return
    }

    // Update local state
    setFinancials(prev => prev?.filter(f => f.id !== selectedDeal.id) || null)
    setIsDeleting(false)
    closePanel()
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 min-h-[56px] md:h-[92px] flex items-center justify-between px-4 md:px-6 py-3 md:py-0 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-gray-500 text-sm hidden md:block">Manage deals, commissions, and payments</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {financials && financials.length > 0 && (
            <div className="hidden sm:block">
              <ExportButtons
                data={exportData}
                filename="financials"
                columns={financialExportColumns}
                sheetName="Financials"
              />
            </div>
          )}
          <Link href="/financials/new" className="btn-primary text-sm">
            <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden md:inline">Add Deal</span>
          </Link>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <div className="bg-white rounded border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Total Deals</p>
            <p className="text-3xl font-semibold text-gray-900">{totals.totalDeals}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Total Deal Value</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totals.totalValue)}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Agency Revenue</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totals.totalAgencyFee)}</p>
          </div>
          <div className="bg-white rounded border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pending Payments</p>
            <p className="text-3xl font-semibold text-gray-900">{totals.pendingPayments}</p>
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
                <tr
                  key={deal.id}
                  className="table-row-hover cursor-pointer"
                  onClick={() => openPanel(deal)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{deal.deal_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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

      {/* Side Panel */}
      {isPanelOpen && selectedDeal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Edit Deal</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={closePanel}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                {/* Deal Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Deal Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="deal_name" className="label">Deal Name *</label>
                      <input
                        type="text"
                        name="deal_name"
                        id="deal_name"
                        required
                        defaultValue={selectedDeal.deal_name}
                        className="mt-1 input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="deal_stage" className="label">Deal Stage *</label>
                        <select name="deal_stage" id="deal_stage" required defaultValue={selectedDeal.deal_stage} className="mt-1 input">
                          {DEAL_STAGES.map(stage => (
                            <option key={stage.value} value={stage.value}>{stage.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="deal_type" className="label">Deal Type *</label>
                        <select name="deal_type" id="deal_type" required defaultValue={selectedDeal.deal_type} className="mt-1 input">
                          {DEAL_TYPES.map(dt => (
                            <option key={dt.value} value={dt.value}>{dt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="athlete_id" className="label">Athlete *</label>
                        <select name="athlete_id" id="athlete_id" required defaultValue={selectedDeal.athlete_id} className="mt-1 input">
                          <option value="">Select athlete</option>
                          {athletes.filter(a => a.outreach_status === 'signed').length > 0 && (
                            <optgroup label="Signed">
                              {athletes.filter(a => a.outreach_status === 'signed').map(athlete => (
                                <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {athletes.filter(a => a.outreach_status !== 'signed').length > 0 && (
                            <optgroup label="Prospects">
                              {athletes.filter(a => a.outreach_status !== 'signed').map(athlete => (
                                <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="deal_date" className="label">Deal Date *</label>
                        <input
                          type="date"
                          name="deal_date"
                          id="deal_date"
                          required
                          defaultValue={selectedDeal.deal_date?.split('T')[0]}
                          className="mt-1 input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Financial Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="deal_value" className="label">Deal Value ($) *</label>
                      <input
                        type="number"
                        name="deal_value"
                        id="deal_value"
                        required
                        min="0"
                        step="0.01"
                        value={dealValue || ''}
                        onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
                        className="mt-1 input"
                      />
                    </div>
                    <div>
                      <label htmlFor="agency_percentage" className="label">Agency % *</label>
                      <input
                        type="number"
                        name="agency_percentage"
                        id="agency_percentage"
                        required
                        min="0"
                        max="100"
                        step="0.1"
                        value={agencyPercentage}
                        onChange={(e) => setAgencyPercentage(parseFloat(e.target.value) || 0)}
                        className="mt-1 input"
                      />
                    </div>
                  </div>

                  {dealValue > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-500">Deal Value</p>
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(dealValue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Agency Fee</p>
                          <p className="text-sm font-semibold text-green-600">{formatCurrency(agencyFee)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Athlete Payout</p>
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(athletePayout)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Info */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Information</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="payment_status" className="label">Status *</label>
                      <select name="payment_status" id="payment_status" required defaultValue={selectedDeal.payment_status} className="mt-1 input">
                        {PAYMENT_STATUSES.map(status => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="invoice_date" className="label">Invoice Date</label>
                      <input
                        type="date"
                        name="invoice_date"
                        id="invoice_date"
                        defaultValue={selectedDeal.invoice_date?.split('T')[0] || ''}
                        className="mt-1 input"
                      />
                    </div>
                    <div>
                      <label htmlFor="payment_date" className="label">Payment Date</label>
                      <input
                        type="date"
                        name="payment_date"
                        id="payment_date"
                        defaultValue={selectedDeal.payment_date?.split('T')[0] || ''}
                        className="mt-1 input"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="border-t border-gray-200 pt-6">
                  <label htmlFor="notes" className="label">Notes</label>
                  <textarea
                    name="notes"
                    id="notes"
                    rows={3}
                    defaultValue={selectedDeal.notes || ''}
                    className="mt-1 input"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button type="button" onClick={closePanel} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="absolute inset-0 bg-white flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Deal</h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-secondary"
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
