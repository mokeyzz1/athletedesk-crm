'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { User, Athlete, OutreachMethod, BrandOutreach, ResponseStatus } from '@/lib/database.types'

export default function EditBrandOutreachPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [outreach, setOutreach] = useState<BrandOutreach | null>(null)

  useEffect(() => {
    async function fetchData() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('google_sso_id', user.id)
          .single()
        if (userData) setCurrentUser(userData as User)
      }

      // Get athletes
      const { data: athletesData } = await supabase
        .from('athletes')
        .select('*')
        .order('name')
      if (athletesData) setAthletes(athletesData as Athlete[])

      // Get existing outreach data
      const { data: outreachData, error: outreachError } = await supabase
        .from('brand_outreach')
        .select('*')
        .eq('id', id)
        .single()

      if (outreachError) {
        setError('Brand outreach record not found')
      } else if (outreachData) {
        setOutreach(outreachData as BrandOutreach)
      }

      setIsLoading(false)
    }
    fetchData()
  }, [supabase, id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const updateData = {
      brand_name: formData.get('brand_name') as string,
      brand_contact_name: (formData.get('brand_contact_name') as string) || null,
      brand_contact_email: (formData.get('brand_contact_email') as string) || null,
      athlete_id: formData.get('athlete_id') as string,
      outreach_method: formData.get('outreach_method') as OutreachMethod,
      response_status: formData.get('response_status') as ResponseStatus,
      date_contacted: formData.get('date_contacted') as string,
      deal_value: formData.get('deal_value') ? parseFloat(formData.get('deal_value') as string) : null,
      product_value: formData.get('product_value') ? parseFloat(formData.get('product_value') as string) : null,
      campaign_details: (formData.get('campaign_details') as string) || null,
      notes: (formData.get('notes') as string) || null,
      follow_up_date: (formData.get('follow_up_date') as string) || null,
    }

    const { error: updateError } = await supabase
      .from('brand_outreach')
      .update(updateData as never)
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
      return
    }

    router.push('/brands')
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this brand outreach record?')) return

    const { error: deleteError } = await supabase
      .from('brand_outreach')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    router.push('/brands')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!outreach) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500">Brand outreach record not found</p>
        <button onClick={() => router.push('/brands')} className="mt-4 btn-primary">
          Back to Brand Outreach
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit Brand Outreach</h1>
            <p className="text-gray-600">Update brand partnership details</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Brand Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Brand Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="brand_name" className="label">Brand Name *</label>
                  <input
                    type="text"
                    name="brand_name"
                    id="brand_name"
                    required
                    defaultValue={outreach.brand_name}
                    className="mt-1 input"
                    placeholder="e.g., Nike, Gatorade, State Farm"
                  />
                </div>
                <div>
                  <label htmlFor="brand_contact_name" className="label">Contact Name</label>
                  <input
                    type="text"
                    name="brand_contact_name"
                    id="brand_contact_name"
                    defaultValue={outreach.brand_contact_name || ''}
                    className="mt-1 input"
                    placeholder="Contact person at brand"
                  />
                </div>
                <div>
                  <label htmlFor="brand_contact_email" className="label">Contact Email</label>
                  <input
                    type="email"
                    name="brand_contact_email"
                    id="brand_contact_email"
                    defaultValue={outreach.brand_contact_email || ''}
                    className="mt-1 input"
                    placeholder="contact@brand.com"
                  />
                </div>
              </div>
            </div>

            {/* Outreach Details */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Outreach Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="athlete_id" className="label">Athlete *</label>
                  <select
                    name="athlete_id"
                    id="athlete_id"
                    required
                    defaultValue={outreach.athlete_id}
                    className="mt-1 input"
                  >
                    <option value="">Select an athlete</option>
                    {athletes.map(athlete => (
                      <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="outreach_method" className="label">Outreach Method *</label>
                  <select
                    name="outreach_method"
                    id="outreach_method"
                    required
                    defaultValue={outreach.outreach_method}
                    className="mt-1 input"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="event">Event / In-Person</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="response_status" className="label">Response Status *</label>
                  <select
                    name="response_status"
                    id="response_status"
                    required
                    defaultValue={outreach.response_status}
                    className="mt-1 input"
                  >
                    <option value="no_response">No Response</option>
                    <option value="interested">Interested</option>
                    <option value="in_discussion">In Discussion</option>
                    <option value="deal_closed">Deal Closed</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="date_contacted" className="label">Date Contacted *</label>
                  <input
                    type="date"
                    name="date_contacted"
                    id="date_contacted"
                    required
                    defaultValue={outreach.date_contacted}
                    className="mt-1 input"
                  />
                </div>
                <div>
                  <label htmlFor="follow_up_date" className="label">Follow-up Date</label>
                  <input
                    type="date"
                    name="follow_up_date"
                    id="follow_up_date"
                    defaultValue={outreach.follow_up_date || ''}
                    className="mt-1 input"
                  />
                </div>
              </div>
            </div>

            {/* Deal Info */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="deal_value" className="label">Potential Deal Value ($)</label>
                  <input
                    type="number"
                    name="deal_value"
                    id="deal_value"
                    min="0"
                    step="0.01"
                    defaultValue={outreach.deal_value || ''}
                    className="mt-1 input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="product_value" className="label">Product Value ($)</label>
                  <input
                    type="number"
                    name="product_value"
                    id="product_value"
                    min="0"
                    step="0.01"
                    defaultValue={outreach.product_value || ''}
                    className="mt-1 input"
                    placeholder="0.00"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="campaign_details" className="label">Campaign Details</label>
                  <textarea
                    name="campaign_details"
                    id="campaign_details"
                    rows={3}
                    defaultValue={outreach.campaign_details || ''}
                    className="mt-1 input"
                    placeholder="Describe the campaign or partnership opportunity..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="label">Notes</label>
                  <textarea
                    name="notes"
                    id="notes"
                    rows={3}
                    defaultValue={outreach.notes || ''}
                    className="mt-1 input"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Delete
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={() => router.back()} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
