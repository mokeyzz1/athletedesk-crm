'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User, Athlete, TaskInsert } from '@/lib/database.types'

export default function NewTaskPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
          const typedUser = userData as User
          setCurrentUser(typedUser)

          // Check if user can create tasks
          if (typedUser.role !== 'admin' && typedUser.role !== 'agent') {
            router.push('/tasks')
            return
          }
        }
      }

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
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentUser) return

    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const taskData: TaskInsert = {
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || null,
      assigned_to: formData.get('assigned_to') as string,
      created_by: currentUser.id,
      athlete_id: (formData.get('athlete_id') as string) || null,
      due_date: (formData.get('due_date') as string) || null,
      priority: (formData.get('priority') as 'high' | 'medium' | 'low') || 'medium',
      status: (formData.get('status') as 'todo' | 'in_progress' | 'done') || 'todo',
    }

    const { error: insertError } = await supabase
      .from('tasks')
      .insert(taskData as never)

    if (insertError) {
      setError(insertError.message)
      setIsSubmitting(false)
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 min-h-[56px] md:h-[92px] flex items-center px-4 md:px-6 py-3 md:py-0 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">New Task</h1>
          <p className="text-gray-500 text-sm hidden md:block">Create a new task for your team</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
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
                    className="mt-1 input w-full"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="label">Description</label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    className="mt-1 input w-full"
                    placeholder="Add details about this task..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="priority" className="label">Priority</label>
                    <select name="priority" id="priority" defaultValue="medium" className="mt-1 input w-full">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="status" className="label">Status</label>
                    <select name="status" id="status" defaultValue="todo" className="mt-1 input w-full">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="assigned_to" className="label">Assign To *</label>
                  <select
                    name="assigned_to"
                    id="assigned_to"
                    required
                    defaultValue={currentUser?.id}
                    className="mt-1 input w-full"
                  >
                    <option value="">Select team member</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="athlete_id" className="label">Related Athlete</label>
                  <select name="athlete_id" id="athlete_id" className="mt-1 input w-full">
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
                  className="mt-1 input w-full sm:w-auto"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 pt-6 flex justify-end gap-3">
              <Link href="/tasks" className="btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
