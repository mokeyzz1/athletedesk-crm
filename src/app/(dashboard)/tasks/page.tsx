import { createClient } from '@/lib/supabase/server'
import type { Task, User, Athlete } from '@/lib/database.types'
import { TasksClient } from './tasks-client'

interface TaskWithRelations extends Task {
  assigned_user: { id: string; name: string; avatar_url: string | null } | null
  creator: { id: string; name: string } | null
  athletes: { id: string; name: string } | null
}

export default async function TasksPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('google_sso_id', user?.id || '')
    .single()

  // Fetch all tasks with relations
  const { data: tasksData } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_user:assigned_to(id, name, avatar_url),
      creator:created_by(id, name),
      athletes:athlete_id(id, name)
    `)
    .order('due_date', { ascending: true, nullsFirst: false })

  // Fetch all users for assignment dropdown
  const { data: usersData } = await supabase
    .from('users')
    .select('*')
    .order('name')

  // Fetch all athletes for dropdown
  const { data: athletesData } = await supabase
    .from('athletes')
    .select('*')
    .order('name')

  const tasks = (tasksData as TaskWithRelations[]) || []
  const users = (usersData as User[]) || []
  const athletes = (athletesData as Athlete[]) || []

  return (
    <TasksClient
      tasks={tasks}
      currentUser={currentUser as User}
      users={users}
      athletes={athletes}
    />
  )
}
