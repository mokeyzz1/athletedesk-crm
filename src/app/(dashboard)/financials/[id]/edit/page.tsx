'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { Athlete, FinancialTracking, DealType, DealStage, PaymentStatus } from '@/lib/database.types'
import { DEAL_TYPES, DEAL_STAGES } from '@/lib/database.types'

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'paid', label: 'Paid' },
]

export default function EditFinancialPage() {
  const router = useRouter()
  const params = useParams()
  const dealId = params.id as string
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [deal, setDeal] = useState<FinancialTracking | null>(null)

  const [dealValue, setDealValue] = useState<number>(0)
  const [agencyPercentage, setAgencyPercentage] = useState<number>(15)

  useEffect(() => {
    async function fetchData() {
      // Fetch deal
      const { data: dealData, error: dealError } = await supabase
        .from('financial_tracking')
        .select('*')
        .eq('id', dealId)
        .single()

      if (dealError || !dealData) {
        setError('Deal not found')
        setIsLoading(false)
        return
      }

      setDeal(dealData as FinancialTracking)
      setDealValue(Number(dealData.deal_value))
      setAgencyPercentage(dealData.agency_percentage)

      // Fetch athletes
      const { data: athletesData } = await supabase
        .from('athletes')
        .select('*')
        .order('outreach_status', { ascending: false })
        .order('name')

      if (athletesData) setAthletes(athletesData as Athlete[])
      setIsLoading(false)
    }

    fetchData()
  }, [supabase, dealId])

  const agencyFee = (dealValue * agencyPercentage) / 100
  const athletePayout = dealValue - agencyFee

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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
      .eq('id', dealId)

    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
      return
    }

    router.push('/financials')
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const { error: deleteError } = await supabase
      .from('financial_tracking')
      .delete()
      .eq('id', dealId)

    if (deleteError) {
      setError(deleteError.message)
      setIsDeleting(false)
      return
    }

    router.push('/financials')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500 mb-4">Deal not found</p>
        <button onClick={() => router.push('/financials')} className="btn-primary">
          Back to Financials
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Deal</h1>
              <p className="text-gray-600">Update financial record details</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Delete Deal
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Deal Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="deal_name" className="label">Deal Name *</label>
                  <input
                    type="text"
                    name="deal_name"
                    id="deal_name"
                    required
                    defaultValue={deal.deal_name}
                    className="mt-1 input"
                  />
                </div>
                <div>
                  <label htmlFor="deal_stage" className="label">Deal Stage *</label>
                  <select name="deal_stage" id="deal_stage" required defaultValue={deal.deal_stage} className="mt-1 input">
                    {DEAL_STAGES.map(stage => (
                      <option key={stage.value} value={stage.value}>{stage.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="athlete_id" className="label">Athlete *</label>
                  <select name="athlete_id" id="athlete_id" required defaultValue={deal.athlete_id} className="mt-1 input">
                    <option value="">Select an athlete</option>
                    {athletes.filter(a => a.outreach_status === 'signed').length > 0 && (
                      <optgroup label="Roster (Signed Athletes)">
                        {athletes.filter(a => a.outreach_status === 'signed').map(athlete => (
                          <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {athletes.filter(a => a.outreach_status !== 'signed').length > 0 && (
                      <optgroup label="Recruiting Database (Prospects)">
                        {athletes.filter(a => a.outreach_status !== 'signed').map(athlete => (
                          <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="deal_type" className="label">Deal Type *</label>
                  <select name="deal_type" id="deal_type" required defaultValue={deal.deal_type} className="mt-1 input">
                    {DEAL_TYPES.map(dt => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="deal_date" className="label">Deal Date *</label>
                  <input
                    type="date"
                    name="deal_date"
                    id="deal_date"
                    required
                    defaultValue={deal.deal_date?.split('T')[0]}
                    className="mt-1 input"
                  />
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label htmlFor="agency_percentage" className="label">Agency Percentage (%) *</label>
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
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Calculated Breakdown</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Deal Value</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(dealValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Agency Fee ({agencyPercentage}%)</p>
                      <p className="text-lg font-semibold text-green-600">{formatCurrency(agencyFee)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Athlete Payout</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(athletePayout)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Info */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="payment_status" className="label">Payment Status *</label>
                  <select name="payment_status" id="payment_status" required defaultValue={deal.payment_status} className="mt-1 input">
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
                    defaultValue={deal.invoice_date?.split('T')[0] || ''}
                    className="mt-1 input"
                  />
                </div>
                <div>
                  <label htmlFor="payment_date" className="label">Payment Date</label>
                  <input
                    type="date"
                    name="payment_date"
                    id="payment_date"
                    defaultValue={deal.payment_date?.split('T')[0] || ''}
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
                defaultValue={deal.notes || ''}
                className="mt-1 input"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => router.back()} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Deal</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this deal? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
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
  )
}
