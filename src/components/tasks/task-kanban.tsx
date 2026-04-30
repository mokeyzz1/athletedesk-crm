'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { DateDisplay } from '@/components/ui/date-display'
import { isOverdue as checkOverdue } from '@/lib/helpers'
import type { Task, User, Athlete } from '@/lib/database.types'
import { isAdminLike } from '@/lib/roles'
import { logClientActivityEvent } from '@/lib/activity-client'

interface TaskWithRelations extends Task {
  assigned_user: { id: string; name: string; avatar_url: string | null } | null
  creator: { id: string; name: string } | null
  athletes: { id: string; name: string } | null
}

interface TaskKanbanProps {
  tasks: TaskWithRelations[]
  currentUser: User
  onTaskClick: (taskId: string) => void
  onTaskUpdated: () => void
}

type TaskStatus = 'todo' | 'in_progress' | 'done'

const columns: { id: TaskStatus; title: string; color: string; bgColor: string }[] = [
  { id: 'todo', title: 'To Do', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { id: 'done', title: 'Done', color: 'text-green-700', bgColor: 'bg-green-100' },
]

export function TaskKanban({ tasks, currentUser, onTaskClick, onTaskUpdated }: TaskKanbanProps) {
  const supabase = createClient()
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status)
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')

    if (!taskId) return

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) {
      setDraggedTaskId(null)
      setDragOverColumn(null)
      return
    }

    // Check permissions
    const canEdit = isAdminLike(currentUser) || task.assigned_to === currentUser.id
    if (!canEdit) {
      setDraggedTaskId(null)
      setDragOverColumn(null)
      return
    }

    // Update task status
    setError(null)
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: newStatus } as never)
      .eq('id', taskId)

    setDraggedTaskId(null)
    setDragOverColumn(null)

    if (updateError) {
      console.error('Failed to update task status:', updateError)
      setError('Could not update task status. Please try again.')
      return
    }

    await logClientActivityEvent({
      entityType: task.athlete_id ? 'athlete' : 'task',
      entityId: task.athlete_id || task.id,
      eventType: newStatus === 'done' ? 'task.completed' : 'task.status_changed',
      title: newStatus === 'done' ? `Task completed: ${task.title}` : `Task status changed: ${task.title}`,
      metadata: {
        task_id: task.id,
        previous_status: task.status,
        new_status: newStatus,
        athlete_id: task.athlete_id,
        source: 'task_kanban',
      },
    })

    onTaskUpdated()
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverColumn(null)
  }

  const getPriorityDot = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-gray-400',
    }
    return colors[priority] || 'bg-gray-400'
  }

  const isOverdue = (task: TaskWithRelations) => {
    if (!task.due_date || task.status === 'done') return false
    return checkOverdue(task.due_date)
  }


  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex gap-3 flex-1 overflow-x-auto pb-4">
      {columns.map(column => {
        const columnTasks = getTasksByStatus(column.id)
        const isDragOver = dragOverColumn === column.id

        return (
          <div
            key={column.id}
            className="flex-1 min-w-[280px] max-w-[350px] flex flex-col"
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                {column.title}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                {columnTasks.length}
              </span>
            </div>

            {/* Column Content */}
            <div
              className={`flex-1 p-2 space-y-2 rounded-b border transition-colors ${
                isDragOver
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {columnTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTaskClick(task.id)}
                  className={`bg-white rounded border border-gray-200 p-3 cursor-pointer hover:border-gray-300 transition-colors ${
                    draggedTaskId === task.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  {/* Task Title with Priority */}
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getPriorityDot(task.priority)}`} />
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {task.title}
                    </p>
                  </div>

                  {/* Task Meta */}
                  <div className="mt-2 flex items-center justify-between">
                    {/* Athlete */}
                    {task.athletes && (
                      <span className="text-xs text-brand-600 truncate max-w-[120px]">
                        {task.athletes.name}
                      </span>
                    )}
                    {!task.athletes && <span />}

                    {/* Due Date */}
                    {task.due_date && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        isOverdue(task)
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <DateDisplay date={task.due_date} short showTodayLabel />
                      </span>
                    )}
                  </div>

                  {/* Assignee */}
                  {task.assigned_user && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {task.assigned_user.avatar_url ? (
                        <Image
                          src={task.assigned_user.avatar_url}
                          alt=""
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-[10px] font-medium text-gray-600">
                            {task.assigned_user.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500 truncate">
                        {task.assigned_user.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* Empty State */}
              {columnTasks.length === 0 && (
                <div className="flex items-center justify-center h-24 text-sm text-gray-400">
                  No tasks
                </div>
              )}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
