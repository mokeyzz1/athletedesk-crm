'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Task, User, Athlete } from '@/lib/database.types'
import { TaskPanel } from '@/components/tasks/task-panel'
import { TaskKanban } from '@/components/tasks/task-kanban'

interface TaskWithRelations extends Task {
  assigned_user: { id: string; name: string; avatar_url: string | null } | null
  creator: { id: string; name: string } | null
  athletes: { id: string; name: string } | null
}

interface TasksClientProps {
  tasks: TaskWithRelations[]
  currentUser: User
  users: User[]
  athletes: Athlete[]
}

type SortColumn = 'title' | 'assigned' | 'athlete' | 'due_date' | 'priority' | 'status'
type SortDirection = 'asc' | 'desc'
type FilterTab = 'all' | 'my_tasks' | 'overdue'
type ViewMode = 'table' | 'kanban'

export function TasksClient({ tasks, currentUser, users, athletes }: TasksClientProps) {
  const router = useRouter()
  const [sortColumn, setSortColumn] = useState<SortColumn>('due_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const canCreateTasks = currentUser.role === 'admin' || currentUser.role === 'agent'

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (activeFilter === 'my_tasks') {
        return task.assigned_to === currentUser.id
      }
      if (activeFilter === 'overdue') {
        if (!task.due_date || task.status === 'done') return false
        return new Date(task.due_date) < today
      }
      return true
    })
  }, [tasks, activeFilter, currentUser.id, today])

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortColumn) {
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'assigned':
          aVal = (a.assigned_user?.name || '').toLowerCase()
          bVal = (b.assigned_user?.name || '').toLowerCase()
          break
        case 'athlete':
          aVal = (a.athletes?.name || '').toLowerCase()
          bVal = (b.athletes?.name || '').toLowerCase()
          break
        case 'due_date':
          aVal = a.due_date ? new Date(a.due_date).getTime() : Infinity
          bVal = b.due_date ? new Date(b.due_date).getTime() : Infinity
          break
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          aVal = priorityOrder[a.priority]
          bVal = priorityOrder[b.priority]
          break
        case 'status':
          const statusOrder = { todo: 0, in_progress: 1, done: 2 }
          aVal = statusOrder[a.status]
          bVal = statusOrder[b.status]
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredTasks, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => (
    sortColumn === column ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : null
  )

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
      todo: 'badge-gray',
      in_progress: 'badge-blue',
      done: 'badge-green',
    }
    return classes[status] || 'badge-gray'
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ')
  }

  const isOverdue = (task: TaskWithRelations) => {
    if (!task.due_date || task.status === 'done') return false
    return new Date(task.due_date) < today
  }

  const isDueToday = (task: TaskWithRelations) => {
    if (!task.due_date) return false
    const dueDate = new Date(task.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() === today.getTime()
  }

  // Counts for tabs
  const myTasksCount = tasks.filter(t => t.assigned_to === currentUser.id && t.status !== 'done').length
  const overdueCount = tasks.filter(t => isOverdue(t)).length

  const handleTaskUpdated = () => {
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 min-h-[56px] md:h-[92px] flex items-center justify-between px-4 md:px-6 py-3 md:py-0 bg-gray-50 border-b border-gray-200">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-500 text-sm">
              {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}
              {activeFilter !== 'all' && ` (${activeFilter.replace('_', ' ')})`}
            </p>
          </div>
          {canCreateTasks && (
            <Link href="/tasks/new" className="btn-primary text-sm">
              <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden md:inline">New Task</span>
            </Link>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
          {/* Filter Tabs & View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setActiveFilter('my_tasks')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-2 ${
                  activeFilter === 'my_tasks'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                My Tasks
                {myTasksCount > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    activeFilter === 'my_tasks' ? 'bg-white/20' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {myTasksCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveFilter('overdue')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-2 ${
                  activeFilter === 'overdue'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Overdue
                {overdueCount > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    activeFilter === 'overdue' ? 'bg-white/20' : 'bg-red-100 text-red-700'
                  }`}>
                    {overdueCount}
                  </span>
                )}
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-gray-200 rounded p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Table view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Kanban view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tasks View */}
          {sortedTasks.length > 0 ? (
            viewMode === 'kanban' ? (
              <TaskKanban
                tasks={sortedTasks}
                currentUser={currentUser}
                onTaskClick={(taskId) => setSelectedTaskId(taskId)}
                onTaskUpdated={handleTaskUpdated}
              />
            ) : (
              <div className="card overflow-hidden p-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th onClick={() => handleSort('title')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                        <div className="flex items-center gap-1">Task <SortIcon column="title" /></div>
                      </th>
                      <th onClick={() => handleSort('assigned')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                        <div className="flex items-center gap-1">Assigned To <SortIcon column="assigned" /></div>
                      </th>
                      <th onClick={() => handleSort('athlete')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                        <div className="flex items-center gap-1">Athlete <SortIcon column="athlete" /></div>
                      </th>
                      <th onClick={() => handleSort('due_date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                        <div className="flex items-center gap-1">Due Date <SortIcon column="due_date" /></div>
                      </th>
                      <th onClick={() => handleSort('priority')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                        <div className="flex items-center gap-1">Priority <SortIcon column="priority" /></div>
                      </th>
                      <th onClick={() => handleSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                        <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTasks.map((task) => (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`table-row-hover cursor-pointer ${selectedTaskId === task.id ? 'bg-brand-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {task.assigned_user?.avatar_url && (
                              <img
                                src={task.assigned_user.avatar_url}
                                alt=""
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <span className="text-sm text-gray-900">
                              {task.assigned_user?.name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {task.athletes ? (
                            <span className="text-sm text-brand-600">
                              {task.athletes.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {task.due_date ? (
                            <span className={`text-sm ${
                              isOverdue(task) ? 'text-red-600 font-medium' :
                              isDueToday(task) ? 'text-yellow-600 font-medium' :
                              'text-gray-900'
                            }`}>
                              {new Date(task.due_date).toLocaleDateString()}
                              {isOverdue(task) && (
                                <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                  Overdue
                                </span>
                              )}
                              {isDueToday(task) && !isOverdue(task) && (
                                <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                                  Today
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">No date</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`${getStatusBadge(task.status)} capitalize`}>
                            {formatStatus(task.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="card">
              <div className="empty-state">
                <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <p className="empty-state-title">
                  {activeFilter === 'all' ? 'No tasks yet' :
                   activeFilter === 'my_tasks' ? 'No tasks assigned to you' :
                   'No overdue tasks'}
                </p>
                <p className="empty-state-description">
                  {activeFilter === 'all'
                    ? 'Create tasks to track work for your team.'
                    : activeFilter === 'my_tasks'
                      ? 'Tasks assigned to you will appear here.'
                      : 'Great job! You have no overdue tasks.'}
                </p>
                {canCreateTasks && activeFilter === 'all' && (
                  <Link href="/tasks/new" className="btn-primary mt-4 inline-flex">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create First Task
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Panel */}
      <TaskPanel
        taskId={selectedTaskId}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        currentUser={currentUser}
        users={users}
        athletes={athletes}
        onTaskUpdated={handleTaskUpdated}
      />
    </>
  )
}
