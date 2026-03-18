'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User, Athlete, Task, TaskUpdate } from '@/lib/database.types'
import { TaskComments } from '@/components/tasks/task-comments'

interface TaskWithRelations extends Task {
  assigned_user: { id: string; name: string; avatar_url: string | null } | null
  creator: { id: string; name: string } | null
  athletes: { id: string; name: string } | null
}

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string
  const supabase = createClient()

  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

        if (userData) {
          setCurrentUser(userData as User)
        }
      }

      // Fetch task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:assigned_to(id, name, avatar_url),
          creator:created_by(id, name),
          athletes:athlete_id(id, name)
        `)
        .eq('id', taskId)
        .single()

      if (taskError || !taskData) {
        router.push('/tasks')
        return
      }

      setTask(taskData as TaskWithRelations)

      // Fetch all users for assignment
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('name')

      if (usersData) {
        setUsers(usersData as User[])
      }

      // Fetch athletes
      const { data: athletesData } = await supabase
        .from('athletes')
        .select('*')
        .order('name')

      if (athletesData) {
        setAthletes(athletesData as Athlete[])
      }

      setIsLoading(false)
    }

    fetchData()
  }, [supabase, router, taskId])

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
      .eq('id', taskId)

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    router.push('/tasks')
  }

  const handleDelete = async () => {
    if (!canDelete || !confirm('Are you sure you want to delete this task?')) return

    setIsDeleting(true)

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (deleteError) {
      setError(deleteError.message)
      setIsDeleting(false)
      return
    }

    router.push('/tasks')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!task) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Task</h1>
          <p className="text-gray-500 text-sm">
            Created by {task.creator?.name || 'Unknown'} on {new Date(task.created_at).toLocaleDateString()}
          </p>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Task'}
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-6">
            {/* Task Details */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Details</h2>
              <div className="space-y-4">
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
              </div>
            </div>

            {/* Assignment */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h2>
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
                        {user.name} ({user.role})
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
            </div>

            {/* Due Date */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
              <div>
                <label htmlFor="due_date" className="label">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  id="due_date"
                  defaultValue={task.due_date || ''}
                  disabled={!canEdit}
                  className="mt-1 input w-full sm:w-auto disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* Comments Section */}
            {currentUser && (
              <TaskComments
                taskId={taskId}
                currentUser={currentUser}
                canComment={!!canEdit}
                users={users}
              />
            )}

            {/* Actions */}
            <div className="border-t border-gray-200 pt-6 flex justify-end gap-3">
              <Link href="/tasks" className="btn-secondary">
                {canEdit ? 'Cancel' : 'Back'}
              </Link>
              {canEdit && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
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
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
