'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CommunicationLog, Athlete, CommunicationType } from '@/lib/database.types'
import { ExportButtons } from '@/components/export/export-buttons'
import { createClient } from '@/lib/supabase/client'

interface CommunicationWithRelations extends CommunicationLog {
  athletes: { id: string; name: string } | null
  users: { id: string; name: string } | null
}

interface CommunicationsClientProps {
  communications: CommunicationWithRelations[] | null
  athletes: Athlete[]
}

type SortColumn = 'date' | 'athlete' | 'type' | 'subject' | 'staff' | 'followup'
type SortDirection = 'asc' | 'desc'

const COMMUNICATION_TYPES = [
  { value: 'email', label: 'Email', badge: 'badge-blue', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { value: 'call', label: 'Call', badge: 'badge-green', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { value: 'text', label: 'Text', badge: 'badge-yellow', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { value: 'zoom', label: 'Zoom', badge: 'badge-blue', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
]

export function CommunicationsClient({ communications: initialCommunications, athletes }: CommunicationsClientProps) {
  const [communications, setCommunications] = useState(initialCommunications)
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showAllCommunications, setShowAllCommunications] = useState(false)
  const [editingItem, setEditingItem] = useState<CommunicationWithRelations | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

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

  const handleMarkComplete = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setCommunications(prev => prev?.map(item =>
      item.id === id ? { ...item, follow_up_completed: !currentStatus } : item
    ) || null)

    const supabase = createClient()
    const { error } = await supabase
      .from('communications_log')
      .update({ follow_up_completed: !currentStatus } as never)
      .eq('id', id)

    if (error) {
      console.error('Failed to update follow-up status:', error)
      router.refresh()
    }
  }

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingItem) return

    setIsSaving(true)
    const formData = new FormData(e.currentTarget)

    const updateData = {
      athlete_id: formData.get('athlete_id') as string,
      type: formData.get('type') as CommunicationType,
      communication_date: formData.get('communication_date') as string,
      subject: (formData.get('subject') as string) || null,
      notes: (formData.get('notes') as string) || null,
      follow_up_date: (formData.get('follow_up_date') as string) || null,
      follow_up_completed: formData.get('follow_up_completed') === 'true',
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('communications_log')
      .update(updateData as never)
      .eq('id', editingItem.id)

    if (error) {
      console.error('Failed to update:', error)
    } else {
      setCommunications(prev => prev?.map(item =>
        item.id === editingItem.id ? { ...item, ...updateData } : item
      ) || null)
      setEditingItem(null)
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!editingItem || !confirm('Are you sure you want to delete this communication?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('communications_log')
      .delete()
      .eq('id', editingItem.id)

    if (error) {
      console.error('Failed to delete:', error)
    } else {
      setCommunications(prev => prev?.filter(item => item.id !== editingItem.id) || null)
      setEditingItem(null)
    }
  }

  // Separate communications into sections
  const { overdueFollowUps, pendingFollowUps, allCommunications } = useMemo(() => {
    if (!communications) return { overdueFollowUps: [], pendingFollowUps: [], allCommunications: [] }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdue = communications.filter(c =>
      c.follow_up_date && !c.follow_up_completed && new Date(c.follow_up_date) < today
    ).sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())

    const pending = communications.filter(c =>
      c.follow_up_date && !c.follow_up_completed && new Date(c.follow_up_date) >= today
    ).sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())

    const sorted = [...communications].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortColumn) {
        case 'date':
          aVal = new Date(a.communication_date).getTime()
          bVal = new Date(b.communication_date).getTime()
          break
        case 'athlete':
          aVal = (a.athletes?.name || '').toLowerCase()
          bVal = (b.athletes?.name || '').toLowerCase()
          break
        case 'type':
          aVal = a.type
          bVal = b.type
          break
        case 'subject':
          aVal = (a.subject || '').toLowerCase()
          bVal = (b.subject || '').toLowerCase()
          break
        case 'staff':
          aVal = (a.users?.name || '').toLowerCase()
          bVal = (b.users?.name || '').toLowerCase()
          break
        case 'followup':
          aVal = a.follow_up_date ? new Date(a.follow_up_date).getTime() : 0
          bVal = b.follow_up_date ? new Date(b.follow_up_date).getTime() : 0
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return {
      overdueFollowUps: overdue,
      pendingFollowUps: pending,
      allCommunications: sorted,
    }
  }, [communications, sortColumn, sortDirection])

  const totalPending = overdueFollowUps.length + pendingFollowUps.length

  const SortIcon = ({ column }: { column: SortColumn }) => (
    sortColumn === column ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : null
  )

  const getTypeBadge = (type: string) => {
    const typeInfo = COMMUNICATION_TYPES.find(t => t.value === type)
    return typeInfo || { badge: 'badge-gray', icon: '', label: type }
  }

  // Flatten data for export
  const exportData = communications?.map(item => ({
    ...item,
    athlete_name: item.athletes?.name || '',
    staff_name: item.users?.name || '',
  })) || []

  const communicationExportColumns = [
    { key: 'communication_date' as const, header: 'Date' },
    { key: 'athlete_name' as const, header: 'Athlete' },
    { key: 'type' as const, header: 'Type' },
    { key: 'subject' as const, header: 'Subject' },
    { key: 'notes' as const, header: 'Notes' },
    { key: 'staff_name' as const, header: 'Staff Member' },
    { key: 'follow_up_date' as const, header: 'Follow-up Date' },
    { key: 'follow_up_completed' as const, header: 'Follow-up Completed' },
  ]

  // Follow-up row component
  const FollowUpRow = ({ comm, isOverdue }: { comm: CommunicationWithRelations; isOverdue: boolean }) => {
    const typeBadge = getTypeBadge(comm.type)
    return (
      <tr className={`table-row-hover ${isOverdue ? 'bg-red-50' : ''}`}>
        <td className="px-4 py-3 whitespace-nowrap">
          <button
            onClick={() => handleMarkComplete(comm.id, comm.follow_up_completed)}
            className="w-5 h-5 rounded border-2 border-gray-300 hover:border-green-500 flex items-center justify-center transition-colors"
            title="Mark as complete"
          >
            {comm.follow_up_completed && (
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {new Date(comm.follow_up_date!).toLocaleDateString()}
          </div>
          {isOverdue && (
            <span className="text-xs text-red-500 font-medium">Overdue</span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <Link
            href={`/athletes/${comm.athlete_id}`}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            {comm.athletes?.name ?? 'Unknown'}
          </Link>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`${typeBadge.badge} inline-flex items-center gap-1`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeBadge.icon} />
            </svg>
            {typeBadge.label}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-gray-900">{comm.subject || 'No subject'}</div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <button
            onClick={() => setEditingItem(comm)}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Edit
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
          <p className="text-gray-500 text-sm">Track all athlete communications</p>
        </div>
        <div className="flex items-center gap-3">
          {communications && communications.length > 0 && (
            <ExportButtons
              data={exportData}
              filename="communications"
              columns={communicationExportColumns}
              sheetName="Communications"
            />
          )}
          <Link href="/communications/new" className="btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Log Communication
          </Link>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {communications && communications.length > 0 ? (
          <>
            {/* Pending Follow-ups Section */}
            {totalPending > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Pending Follow-ups</h2>
                  <span className={`text-sm px-2 py-0.5 rounded-full ${overdueFollowUps.length > 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {totalPending}
                  </span>
                </div>
                <div className="card p-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Athlete</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {overdueFollowUps.map((comm) => (
                        <FollowUpRow key={comm.id} comm={comm} isOverdue={true} />
                      ))}
                      {pendingFollowUps.map((comm) => (
                        <FollowUpRow key={comm.id} comm={comm} isOverdue={false} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All Communications Section */}
            <div>
              <button
                onClick={() => setShowAllCommunications(!showAllCommunications)}
                className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3"
              >
                <svg
                  className={`w-5 h-5 transition-transform ${showAllCommunications ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                All Communications ({allCommunications.length})
              </button>
              {showAllCommunications && (
                <div className="card p-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th onClick={() => handleSort('date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                          <div className="flex items-center gap-1">Date <SortIcon column="date" /></div>
                        </th>
                        <th onClick={() => handleSort('athlete')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                          <div className="flex items-center gap-1">Athlete <SortIcon column="athlete" /></div>
                        </th>
                        <th onClick={() => handleSort('type')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                          <div className="flex items-center gap-1">Type <SortIcon column="type" /></div>
                        </th>
                        <th onClick={() => handleSort('subject')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                          <div className="flex items-center gap-1">Subject <SortIcon column="subject" /></div>
                        </th>
                        <th onClick={() => handleSort('followup')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                          <div className="flex items-center gap-1">Follow-up <SortIcon column="followup" /></div>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allCommunications.map((comm) => {
                        const typeBadge = getTypeBadge(comm.type)
                        return (
                          <tr key={comm.id} className="table-row-hover">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(comm.communication_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link
                                href={`/athletes/${comm.athlete_id}`}
                                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                              >
                                {comm.athletes?.name ?? 'Unknown'}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`${typeBadge.badge} inline-flex items-center gap-1`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeBadge.icon} />
                                </svg>
                                {typeBadge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{comm.subject || 'No subject'}</div>
                              {comm.notes && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">{comm.notes}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {comm.follow_up_date ? (
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${comm.follow_up_completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                    {new Date(comm.follow_up_date).toLocaleDateString()}
                                  </span>
                                  {comm.follow_up_completed ? (
                                    <span className="badge-green text-xs">Done</span>
                                  ) : (
                                    <span className="badge-yellow text-xs">Pending</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => setEditingItem(comm)}
                                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card">
            <div className="empty-state">
              <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="empty-state-title">Stay connected</p>
              <p className="empty-state-description">Log your calls, emails, texts, and meetings with athletes to keep track of all touchpoints and never miss a follow-up.</p>
              <Link href="/communications/new" className="btn-primary mt-4 inline-flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Log First Communication
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
              <h2 className="text-lg font-semibold text-gray-900">Edit Communication</h2>
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
                {/* Communication Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Communication Details</h3>
                  <div className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="type" className="label">Type *</label>
                        <select
                          name="type"
                          id="type"
                          required
                          defaultValue={editingItem.type}
                          className="mt-1 input"
                        >
                          {COMMUNICATION_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="communication_date" className="label">Date *</label>
                        <input
                          type="date"
                          name="communication_date"
                          id="communication_date"
                          required
                          defaultValue={editingItem.communication_date}
                          className="mt-1 input"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="subject" className="label">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        id="subject"
                        defaultValue={editingItem.subject || ''}
                        className="mt-1 input"
                      />
                    </div>
                    <div>
                      <label htmlFor="notes" className="label">Notes</label>
                      <textarea
                        name="notes"
                        id="notes"
                        rows={4}
                        defaultValue={editingItem.notes || ''}
                        className="mt-1 input"
                      />
                    </div>
                  </div>
                </div>

                {/* Follow-up Settings */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Follow-up</h3>
                  <div className="space-y-4">
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
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="follow_up_completed"
                        id="follow_up_completed"
                        value="true"
                        defaultChecked={editingItem.follow_up_completed}
                        className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                      />
                      <label htmlFor="follow_up_completed" className="text-sm text-gray-700">
                        Follow-up completed
                      </label>
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
    </div>
  )
}
