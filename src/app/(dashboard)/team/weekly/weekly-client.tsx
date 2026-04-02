'use client'

import Link from 'next/link'
import type { DayActivity } from './page'

interface WeeklyClientProps {
  days: DayActivity[]
  weekLabel: string
}

export function WeeklyClient({ days, weekLabel }: WeeklyClientProps) {
  const today = new Date().toISOString().split('T')[0]

  const getPriorityBadge = (priority: string) => {
    const classes: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-600',
    }
    return classes[priority] || 'bg-gray-100 text-gray-600'
  }

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      todo: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      done: 'bg-green-100 text-green-700',
    }
    return classes[status] || 'bg-gray-100 text-gray-700'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
      case 'call':
        return 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
      case 'text':
        return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
      default:
        return 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
    }
  }

  // Calculate totals
  const totalTasks = days.reduce((sum, d) => sum + d.tasks.length, 0)
  const totalComms = days.reduce((sum, d) => sum + d.communications.length, 0)
  const totalFollowUps = days.reduce((sum, d) => sum + d.followUps.length, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly View</h1>
          <p className="text-gray-500 text-sm">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span><strong>{totalTasks}</strong> tasks</span>
            <span><strong>{totalComms}</strong> comms</span>
            <span><strong>{totalFollowUps}</strong> follow-ups</span>
          </div>
          <Link href="/team/productivity" className="btn-secondary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Productivity
          </Link>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-x-auto px-6 py-4">
        {/* Calendar Grid */}
        <div className="flex gap-4 min-w-max">
          {days.map(day => {
            const isToday = day.date === today
            const hasActivity = day.tasks.length > 0 || day.communications.length > 0 || day.followUps.length > 0

            return (
              <div
                key={day.date}
                className={`w-64 flex-shrink-0 rounded-lg border ${
                  isToday ? 'border-brand-300 bg-brand-50/30' : 'border-gray-200 bg-white'
                }`}
              >
                {/* Day Header */}
                <div className={`px-4 py-3 border-b ${isToday ? 'border-brand-200' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${isToday ? 'text-brand-700' : 'text-gray-700'}`}>
                      {day.dayName}
                    </span>
                    {isToday && (
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {/* Day Content */}
                <div className="p-3 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {/* Tasks */}
                  {day.tasks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Tasks ({day.tasks.length})
                      </div>
                      <div className="space-y-2">
                        {day.tasks.map(task => (
                          <Link
                            key={task.id}
                            href={`/tasks?id=${task.id}`}
                            className="block p-2 bg-white rounded border border-gray-100 hover:border-gray-200 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-sm ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getPriorityBadge(task.priority)}`}>
                                {task.priority[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${getStatusBadge(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-500">{task.assignedTo}</span>
                            </div>
                            {task.athleteName && (
                              <span className="text-xs text-brand-600 block mt-1">{task.athleteName}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Communications */}
                  {day.communications.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Communications ({day.communications.length})
                      </div>
                      <div className="space-y-2">
                        {day.communications.map(comm => (
                          <div key={comm.id} className="p-2 bg-blue-50 rounded border border-blue-100">
                            <div className="flex items-center gap-2">
                              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTypeIcon(comm.type)} />
                              </svg>
                              <span className="text-xs font-medium text-blue-700 capitalize">{comm.type}</span>
                            </div>
                            {comm.subject && (
                              <p className="text-sm text-gray-900 mt-1 truncate">{comm.subject}</p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">{comm.staffName}</span>
                              {comm.athleteName && (
                                <span className="text-xs text-brand-600">{comm.athleteName}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-ups */}
                  {day.followUps.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Follow-ups ({day.followUps.length})
                      </div>
                      <div className="space-y-2">
                        {day.followUps.map(followUp => (
                          <div key={followUp.id} className="p-2 bg-yellow-50 rounded border border-yellow-100">
                            <p className="text-sm text-gray-900">{followUp.subject || 'Follow-up'}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">{followUp.staffName}</span>
                              {followUp.athleteName && (
                                <span className="text-xs text-brand-600">{followUp.athleteName}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {!hasActivity && (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400">No activity</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
