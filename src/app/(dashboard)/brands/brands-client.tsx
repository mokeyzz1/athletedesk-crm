'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { BrandOutreach, Athlete, OutreachMethod, ResponseStatus } from '@/lib/database.types'
import { ExportButtons } from '@/components/export/export-buttons'
import { createClient } from '@/lib/supabase/client'

interface BrandOutreachWithRelations extends BrandOutreach {
  athletes: { id: string; name: string } | null
  users: { id: string; name: string } | null
}

interface BrandsClientProps {
  outreach: BrandOutreachWithRelations[] | null
  athletes: Athlete[]
}

type SortColumn = 'brand' | 'athlete' | 'method' | 'status' | 'value' | 'date' | 'staff'
type SortDirection = 'asc' | 'desc'

const COMPLETED_STATUSES = ['deal_closed', 'not_interested']

const STATUS_OPTIONS = [
  { value: 'no_response', label: 'No Response', badge: 'badge-gray' },
  { value: 'interested', label: 'Interested', badge: 'badge-blue' },
  { value: 'in_discussion', label: 'In Discussion', badge: 'badge-yellow' },
  { value: 'deal_closed', label: 'Deal Closed', badge: 'badge-green' },
  { value: 'not_interested', label: 'Deal Lost', badge: 'badge-red' },
]

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

export function BrandsClient({ outreach: initialOutreach, athletes }: BrandsClientProps) {
  const [outreach, setOutreach] = useState(initialOutreach)
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showCompleted, setShowCompleted] = useState(false)
  const [statusDropdown, setStatusDropdown] = useState<{ item: BrandOutreachWithRelations; position: { top: number; left: number } } | null>(null)
  const [editingItem, setEditingItem] = useState<BrandOutreachWithRelations | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // For portal mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setStatusDropdown(null)

    // Optimistic update
    setOutreach(prev => prev?.map(item =>
      item.id === id ? { ...item, response_status: newStatus as BrandOutreach['response_status'] } : item
    ) || null)

    const supabase = createClient()
    const { error } = await supabase
      .from('brand_outreach')
      .update({ response_status: newStatus } as never)
      .eq('id', id)

    if (error) {
      console.error('Failed to update status:', error)
      router.refresh()
    }
  }

  const handleStatusClick = (e: React.MouseEvent, item: BrandOutreachWithRelations) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setStatusDropdown({
      item,
      position: {
        top: rect.bottom + 4,
        left: rect.left,
      }
    })
  }

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingItem) return

    setIsSaving(true)
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

    const supabase = createClient()
    const { error } = await supabase
      .from('brand_outreach')
      .update(updateData as never)
      .eq('id', editingItem.id)

    if (error) {
      console.error('Failed to update:', error)
    } else {
      // Update local state
      setOutreach(prev => prev?.map(item =>
        item.id === editingItem.id ? { ...item, ...updateData } : item
      ) || null)
      setEditingItem(null)
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!editingItem || !confirm('Are you sure you want to delete this outreach record?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('brand_outreach')
      .delete()
      .eq('id', editingItem.id)

    if (error) {
      console.error('Failed to delete:', error)
    } else {
      setOutreach(prev => prev?.filter(item => item.id !== editingItem.id) || null)
      setEditingItem(null)
    }
  }

  const sortItems = (items: BrandOutreachWithRelations[]) => {
    return [...items].sort((a, b) => {
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
  }

  const { activeOutreach, completedOutreach } = useMemo(() => {
    if (!outreach) return { activeOutreach: [], completedOutreach: [] }
    const active = outreach.filter(item => !COMPLETED_STATUSES.includes(item.response_status))
    const completed = outreach.filter(item => COMPLETED_STATUSES.includes(item.response_status))
    return {
      activeOutreach: sortItems(active),
      completedOutreach: sortItems(completed),
    }
  }, [outreach, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => (
    sortColumn === column ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : null
  )

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status)
    return option?.badge || 'badge-gray'
  }

  const getStatusLabel = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status)
    return option?.label || status.replace(/_/g, ' ')
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Status badge button that triggers dropdown
  const StatusBadge = ({ item }: { item: BrandOutreachWithRelations }) => (
    <button
      onClick={(e) => handleStatusClick(e, item)}
      className={`${getStatusBadge(item.response_status)} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 flex items-center gap-1`}
    >
      {getStatusLabel(item.response_status)}
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )

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
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {outreach && outreach.length > 0 ? (
        <>
          {/* Active Deals */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Deals ({activeOutreach.length})</h2>
            {activeOutreach.length > 0 ? (
              <div className="card p-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th onClick={() => handleSort('brand')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                        <div className="flex items-center gap-1">Brand <SortIcon column="brand" /></div>
                      </th>
                      <th onClick={() => handleSort('athlete')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                        <div className="flex items-center gap-1">Athlete <SortIcon column="athlete" /></div>
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeOutreach.map((item) => (
                      <tr
                        key={item.id}
                        className="table-row-hover"
                      >
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge item={item} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(item.deal_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.date_contacted).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card text-center py-8 text-gray-500">
                No active deals. All deals have been closed or lost.
              </div>
            )}
          </div>

          {/* Completed Deals */}
          {completedOutreach.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3"
              >
                <svg
                  className={`w-5 h-5 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Completed ({completedOutreach.length})
              </button>
              {showCompleted && (
                <div className="card p-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Athlete</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {completedOutreach.map((item) => (
                        <tr
                          key={item.id}
                          className="table-row-hover opacity-75"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.brand_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/athletes/${item.athlete_id}`}
                              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                            >
                              {item.athletes?.name ?? 'Unknown'}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge item={item} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(item.deal_value)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.date_contacted).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
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

      {/* Side Panel for Editing */}
      {editingItem && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
            onClick={() => setEditingItem(null)}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Edit Brand Outreach</h2>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-500 p-1 rounded-md hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Brand Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Brand Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="brand_name" className="label">Brand Name *</label>
                    <input
                      type="text"
                      name="brand_name"
                      id="brand_name"
                      required
                      defaultValue={editingItem.brand_name}
                      className="mt-1 input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="brand_contact_name" className="label">Contact Name</label>
                      <input
                        type="text"
                        name="brand_contact_name"
                        id="brand_contact_name"
                        defaultValue={editingItem.brand_contact_name || ''}
                        className="mt-1 input"
                      />
                    </div>
                    <div>
                      <label htmlFor="brand_contact_email" className="label">Contact Email</label>
                      <input
                        type="email"
                        name="brand_contact_email"
                        id="brand_contact_email"
                        defaultValue={editingItem.brand_contact_email || ''}
                        className="mt-1 input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Outreach Details */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Outreach Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="athlete_id" className="label">Athlete *</label>
                      <select
                        name="athlete_id"
                        id="athlete_id"
                        required
                        defaultValue={editingItem.athlete_id}
                        className="mt-1 input"
                      >
                        {athletes.map(athlete => (
                          <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="response_status" className="label">Status *</label>
                      <select
                        name="response_status"
                        id="response_status"
                        required
                        defaultValue={editingItem.response_status}
                        className="mt-1 input"
                      >
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="outreach_method" className="label">Method *</label>
                      <select
                        name="outreach_method"
                        id="outreach_method"
                        required
                        defaultValue={editingItem.outreach_method}
                        className="mt-1 input"
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="event">Event / In-Person</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="date_contacted" className="label">Date Contacted *</label>
                      <input
                        type="date"
                        name="date_contacted"
                        id="date_contacted"
                        required
                        defaultValue={editingItem.date_contacted}
                        className="mt-1 input"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="follow_up_date" className="label">Follow-up Date</label>
                    <input
                      type="date"
                      name="follow_up_date"
                      id="follow_up_date"
                      defaultValue={editingItem.follow_up_date || ''}
                      className="mt-1 input"
                    />
                  </div>
                </div>
              </div>

              {/* Deal Info */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Deal Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="deal_value" className="label">Deal Value ($)</label>
                      <input
                        type="number"
                        name="deal_value"
                        id="deal_value"
                        min="0"
                        step="0.01"
                        defaultValue={editingItem.deal_value || ''}
                        className="mt-1 input"
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
                        defaultValue={editingItem.product_value || ''}
                        className="mt-1 input"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="campaign_details" className="label">Campaign Details</label>
                    <textarea
                      name="campaign_details"
                      id="campaign_details"
                      rows={3}
                      defaultValue={editingItem.campaign_details || ''}
                      className="mt-1 input"
                    />
                  </div>
                  <div>
                    <label htmlFor="notes" className="label">Notes</label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      defaultValue={editingItem.notes || ''}
                      className="mt-1 input"
                    />
                  </div>
                </div>
              </div>

              </div>

              {/* Sticky Footer */}
              <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Delete
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Status Dropdown Portal - renders outside all containers */}
      {mounted && statusDropdown && createPortal(
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setStatusDropdown(null)}
          />
          {/* Dropdown menu */}
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{
              zIndex: 9999,
              top: statusDropdown.position.top,
              left: statusDropdown.position.left,
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusUpdate(statusDropdown.item.id, option.value)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                  option.value === statusDropdown.item.response_status ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <span className={`${option.badge} text-xs`}>{option.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
