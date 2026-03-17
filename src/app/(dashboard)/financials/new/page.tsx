'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { Athlete, FinancialTrackingInsert } from '@/lib/database.types'

export default function NewFinancialPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [dealValue, setDealValue] = useState<number>(0)
  const [agencyPercentage, setAgencyPercentage] = useState<number>(15)

  useEffect(() => {
    async function fetchAthletes() {
      const { data } = await supabase
        .from('athletes')
        .select('*')
        .order('name')
      if (data) setAthletes(data as Athlete[])
    }
    fetchAthletes()
  }, [supabase])

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

    const financialData: FinancialTrackingInsert = {
      athlete_id: formData.get('athlete_id') as string,
      deal_name: formData.get('deal_name') as string,
      deal_value: parseFloat(formData.get('deal_value') as string),
      agency_percentage: parseFloat(formData.get('agency_percentage') as string),
      deal_date: formData.get('deal_date') as string,
      payment_status: 'pending',
      invoice_date: (formData.get('invoice_date') as string) || null,
      notes: (formData.get('notes') as string) || null,
    }

    const { error: insertError } = await supabase
      .from('financial_tracking')
      .insert(financialData as never)

    if (insertError) {
      setError(insertError.message)
      setIsSubmitting(false)
      return
    }

    router.push('/financials')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Record New Deal</h1>
        <p className="text-gray-600">Add a new financial record for an athlete deal</p>
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
                className="mt-1 input"
                placeholder="e.g., Nike Endorsement Q1 2024"
              />
            </div>
            <div>
              <label htmlFor="athlete_id" className="label">Athlete *</label>
              <select name="athlete_id" id="athlete_id" required className="mt-1 input">
                <option value="">Select an athlete</option>
                {athletes.map(athlete => (
                  <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
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
                defaultValue={new Date().toISOString().split('T')[0]}
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
                placeholder="0.00"
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

          {/* Calculated Values */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="invoice_date" className="label">Invoice Date</label>
              <input
                type="date"
                name="invoice_date"
                id="invoice_date"
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
            className="mt-1 input"
            placeholder="Any additional notes about this deal..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : 'Record Deal'}
          </button>
        </div>
      </form>
    </div>
  )
}
