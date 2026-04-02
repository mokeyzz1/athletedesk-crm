'use client'

import { useState } from 'react'
import Link from 'next/link'

interface StaffProductivity {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string | null
  emailsThisWeek: number
  emailsThisMonth: number
  emailsAllTime: number
  commsThisWeek: number
  commsThisMonth: number
  commsAllTime: number
  tasksCompleted: number
  tasksPending: number
  tasksOverdue: number
  athletesManaged: number
}

interface ProductivityClientProps {
  staffProductivity: StaffProductivity[]
}

type SortColumn = 'name' | 'emails' | 'comms' | 'tasks' | 'athletes' | 'score'
type SortDirection = 'asc' | 'desc'
type TimeRange = 'week' | 'month' | 'all'

export function ProductivityClient({ staffProductivity }: ProductivityClientProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('score')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [timeRange, setTimeRange] = useState<TimeRange>('week')

  // Calculate productivity score (weighted metrics)
  const calculateScore = (staff: StaffProductivity) => {
    const emailsWeight = 2
    const commsWeight = 1
    const tasksWeight = 3
    const overdueWeight = -5

    const emails = timeRange === 'week' ? staff.emailsThisWeek :
                   timeRange === 'month' ? staff.emailsThisMonth : staff.emailsAllTime
    const comms = timeRange === 'week' ? staff.commsThisWeek :
                  timeRange === 'month' ? staff.commsThisMonth : staff.commsAllTime

    return (emails * emailsWeight) + (comms * commsWeight) +
           (staff.tasksCompleted * tasksWeight) + (staff.tasksOverdue * overdueWeight)
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection(column === 'name' ? 'asc' : 'desc')
    }
  }

  const sortedStaff = [...staffProductivity].sort((a, b) => {
    let aVal: string | number = ''
    let bVal: string | number = ''

    switch (sortColumn) {
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case 'emails':
        aVal = timeRange === 'week' ? a.emailsThisWeek :
               timeRange === 'month' ? a.emailsThisMonth : a.emailsAllTime
        bVal = timeRange === 'week' ? b.emailsThisWeek :
               timeRange === 'month' ? b.emailsThisMonth : b.emailsAllTime
        break
      case 'comms':
        aVal = timeRange === 'week' ? a.commsThisWeek :
               timeRange === 'month' ? a.commsThisMonth : a.commsAllTime
        bVal = timeRange === 'week' ? b.commsThisWeek :
               timeRange === 'month' ? b.commsThisMonth : b.commsAllTime
        break
      case 'tasks':
        aVal = a.tasksCompleted
        bVal = b.tasksCompleted
        break
      case 'athletes':
        aVal = a.athletesManaged
        bVal = b.athletesManaged
        break
      case 'score':
        aVal = calculateScore(a)
        bVal = calculateScore(b)
        break
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      agent: 'bg-blue-100 text-blue-700',
      scout: 'bg-green-100 text-green-700',
      marketing: 'bg-orange-100 text-orange-700',
      intern: 'bg-gray-100 text-gray-700',
    }
    return badges[role] || 'bg-gray-100 text-gray-700'
  }

  const SortIcon = ({ column }: { column: SortColumn }) => (
    sortColumn === column ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : null
  )

  // Team totals
  const totalEmails = staffProductivity.reduce((sum, s) =>
    sum + (timeRange === 'week' ? s.emailsThisWeek : timeRange === 'month' ? s.emailsThisMonth : s.emailsAllTime), 0)
  const totalComms = staffProductivity.reduce((sum, s) =>
    sum + (timeRange === 'week' ? s.commsThisWeek : timeRange === 'month' ? s.commsThisMonth : s.commsAllTime), 0)
  const totalTasksCompleted = staffProductivity.reduce((sum, s) => sum + s.tasksCompleted, 0)
  const totalOverdue = staffProductivity.reduce((sum, s) => sum + s.tasksOverdue, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Productivity</h1>
          <p className="text-gray-500 text-sm">Track team performance and activity metrics</p>
        </div>
        <Link href="/team/weekly" className="btn-secondary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Weekly View
        </Link>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalEmails}</p>
                <p className="text-sm text-gray-500">
                  Emails {timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'All Time'}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalComms}</p>
                <p className="text-sm text-gray-500">
                  Communications {timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : 'Total'}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalTasksCompleted}</p>
                <p className="text-sm text-gray-500">Tasks Completed</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalOverdue > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <svg className={`w-5 h-5 ${totalOverdue > 0 ? 'text-red-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`text-2xl font-bold ${totalOverdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>{totalOverdue}</p>
                <p className="text-sm text-gray-500">Overdue Tasks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Time range:</span>
          <div className="flex gap-1">
            {(['week', 'month', 'all'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  timeRange === range
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Table */}
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Staff <SortIcon column="name" /></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th onClick={() => handleSort('emails')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Emails <SortIcon column="emails" /></div>
                </th>
                <th onClick={() => handleSort('comms')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Communications <SortIcon column="comms" /></div>
                </th>
                <th onClick={() => handleSort('tasks')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Tasks <SortIcon column="tasks" /></div>
                </th>
                <th onClick={() => handleSort('athletes')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Athletes <SortIcon column="athletes" /></div>
                </th>
                <th onClick={() => handleSort('score')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">Score <SortIcon column="score" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStaff.map((staff) => {
                const emails = timeRange === 'week' ? staff.emailsThisWeek :
                               timeRange === 'month' ? staff.emailsThisMonth : staff.emailsAllTime
                const comms = timeRange === 'week' ? staff.commsThisWeek :
                              timeRange === 'month' ? staff.commsThisMonth : staff.commsAllTime
                const score = calculateScore(staff)

                return (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {staff.avatar_url ? (
                          <img src={staff.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                            <span className="text-brand-600 font-medium text-sm">
                              {staff.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{staff.name}</div>
                          <div className="text-sm text-gray-500">{staff.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${getRoleBadge(staff.role)}`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium text-gray-900">{emails}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{comms}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-600">{staff.tasksCompleted}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-500">{staff.tasksPending} pending</span>
                        {staff.tasksOverdue > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            {staff.tasksOverdue} overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{staff.athletesManaged}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${score > 0 ? 'bg-green-500' : 'bg-gray-400'}`}
                            style={{ width: `${Math.min(100, Math.max(0, score / 2))}%` }}
                          />
                        </div>
                        <span className={`font-medium ${score > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {score}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
