'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, User, Athlete } from '@/lib/database.types'

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
    const canEdit = currentUser.role === 'admin' || task.assigned_to === currentUser.id
    if (!canEdit) {
      setDraggedTaskId(null)
      setDragOverColumn(null)
      return
    }

    // Update task status
    await supabase
      .from('tasks')
      .update({ status: newStatus } as never)
      .eq('id', taskId)

    setDraggedTaskId(null)
    setDragOverColumn(null)
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(task.due_date) < today
  }

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === today.getTime()) return 'Today'
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-4">
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
                        {formatDueDate(task.due_date)}
                      </span>
                    )}
                  </div>

                  {/* Assignee */}
                  {task.assigned_user && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {task.assigned_user.avatar_url ? (
                        <img
                          src={task.assigned_user.avatar_url}
                          alt=""
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
  )
}
