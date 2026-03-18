'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { CommunicationLog } from '@/lib/database.types'
import { ExportButtons } from '@/components/export/export-buttons'

interface CommunicationWithRelations extends CommunicationLog {
  athletes: { id: string; name: string } | null
  users: { id: string; name: string } | null
}

interface CommunicationsClientProps {
  communications: CommunicationWithRelations[] | null
}

type SortColumn = 'date' | 'athlete' | 'type' | 'subject' | 'staff' | 'followup'
type SortDirection = 'asc' | 'desc'

export function CommunicationsClient({ communications }: CommunicationsClientProps) {
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

  const sortedCommunications = useMemo(() => {
    if (!communications) return []
    return [...communications].sort((a, b) => {
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
  }, [communications, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => (
    sortColumn === column ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : null
  )
  const getTypeBadge = (type: string) => {
    const typeClasses: Record<string, { class: string; icon: string }> = {
      email: { class: 'badge-blue', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      call: { class: 'badge-green', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
      text: { class: 'badge-yellow', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
      zoom: { class: 'badge-blue', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    }
    return typeClasses[type] || { class: 'badge-gray', icon: '' }
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communications Log</h1>
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
      <div className="flex-1 overflow-y-auto px-6 py-4">
      {communications && communications.length > 0 ? (
        <div className="card overflow-hidden p-0">
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
                <th onClick={() => handleSort('staff')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Staff <SortIcon column="staff" /></div>
                </th>
                <th onClick={() => handleSort('followup')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  <div className="flex items-center gap-1">Follow-up <SortIcon column="followup" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCommunications.map((comm) => {
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
                      <span className={`${typeBadge.class} inline-flex items-center gap-1`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeBadge.icon} />
                        </svg>
                        {comm.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{comm.subject || 'No subject'}</div>
                      {comm.notes && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{comm.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {comm.users?.name ?? 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {comm.follow_up_date ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${comm.follow_up_completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {new Date(comm.follow_up_date).toLocaleDateString()}
                          </span>
                          {comm.follow_up_completed ? (
                            <span className="badge-green">Done</span>
                          ) : (
                            <span className="badge-yellow">Pending</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
    </div>
  )
}
