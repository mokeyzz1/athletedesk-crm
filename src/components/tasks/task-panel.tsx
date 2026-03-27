'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Athlete, Task, TaskUpdate } from '@/lib/database.types'
import { TaskComments } from './task-comments'

interface TaskWithRelations extends Task {
  assigned_user: { id: string; name: string; avatar_url: string | null } | null
  creator: { id: string; name: string } | null
  athletes: { id: string; name: string } | null
}

interface TaskPanelProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  currentUser: User
  users: User[]
  athletes: Athlete[]
  onTaskUpdated: () => void
}

export function TaskPanel({
  taskId,
  isOpen,
  onClose,
  currentUser,
  users,
  athletes,
  onTaskUpdated
}: TaskPanelProps) {
  const supabase = createClient()
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId || !isOpen) {
      setTask(null)
      return
    }

    async function fetchTask() {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:assigned_to(id, name, avatar_url),
          creator:created_by(id, name),
          athletes:athlete_id(id, name)
        `)
        .eq('id', taskId!)
        .single()

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setTask(data as TaskWithRelations)
      }
      setIsLoading(false)
    }

    fetchTask()
  }, [taskId, isOpen, supabase])

  const canEdit = currentUser && task && (
    currentUser.role === 'admin' ||
    task.assigned_to === currentUser.id
  )

  const canDelete = currentUser && task && (
    currentUser.role === 'admin' ||
    task.created_by === currentUser.id
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canEdit || !task) return

    setIsSaving(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const updateData: TaskUpdate = {
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || null,
      assigned_to: formData.get('assigned_to') as string,
      athlete_id: (formData.get('athlete_id') as string) || null,
      due_date: (formData.get('due_date') as string) || null,
      priority: formData.get('priority') as 'high' | 'medium' | 'low',
      status: formData.get('status') as 'todo' | 'in_progress' | 'done',
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData as never)
      .eq('id', task.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      onTaskUpdated()
      // Refresh task data
      const { data } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:assigned_to(id, name, avatar_url),
          creator:created_by(id, name),
          athletes:athlete_id(id, name)
        `)
        .eq('id', task.id)
        .single()
      if (data) setTask(data as TaskWithRelations)
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!canDelete || !task || !confirm('Are you sure you want to delete this task?')) return

    setIsDeleting(true)

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsDeleting(false)
    } else {
      onTaskUpdated()
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[480px] bg-white border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="font-semibold text-gray-900">
              {isLoading ? 'Loading...' : task ? 'Edit Task' : 'Task Details'}
            </h2>
          </div>
          {canDelete && task && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-56px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            </div>
          ) : task ? (
            <form onSubmit={handleSubmit} className="p-4 space-y-5">
              {/* Created by info */}
              <p className="text-xs text-gray-500">
                Created by {task.creator?.name || 'Unknown'} on {new Date(task.created_at).toLocaleDateString()}
              </p>

              {/* Title */}
              <div>
                <label htmlFor="title" className="label">Title *</label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  defaultValue={task.title}
                  disabled={!canEdit}
                  className="mt-1 input w-full disabled:bg-gray-100"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="label">Description</label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  defaultValue={task.description || ''}
                  disabled={!canEdit}
                  className="mt-1 input w-full disabled:bg-gray-100"
                />
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="priority" className="label">Priority</label>
                  <select
                    name="priority"
                    id="priority"
                    defaultValue={task.priority}
                    disabled={!canEdit}
                    className="mt-1 input w-full disabled:bg-gray-100"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="label">Status</label>
                  <select
                    name="status"
                    id="status"
                    defaultValue={task.status}
                    disabled={!canEdit}
                    className="mt-1 input w-full disabled:bg-gray-100"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              {/* Assigned To & Athlete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="assigned_to" className="label">Assigned To *</label>
                  <select
                    name="assigned_to"
                    id="assigned_to"
                    required
                    defaultValue={task.assigned_to}
                    disabled={!canEdit || currentUser?.role !== 'admin'}
                    className="mt-1 input w-full disabled:bg-gray-100"
                  >
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="athlete_id" className="label">Related Athlete</label>
                  <select
                    name="athlete_id"
                    id="athlete_id"
                    defaultValue={task.athlete_id || ''}
                    disabled={!canEdit}
                    className="mt-1 input w-full disabled:bg-gray-100"
                  >
                    <option value="">None</option>
                    {athletes.map(athlete => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="due_date" className="label">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  id="due_date"
                  defaultValue={task.due_date || ''}
                  disabled={!canEdit}
                  className="mt-1 input w-full disabled:bg-gray-100"
                />
              </div>

              {/* Save Button */}
              {canEdit && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary w-full"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              )}

              {/* Comments Section */}
              <TaskComments
                taskId={task.id}
                currentUser={currentUser}
                canComment={!!canEdit}
                users={users}
              />
            </form>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Select a task to view details
            </div>
          )}
        </div>
      </div>
    </>
  )
}
