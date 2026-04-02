import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@/lib/database.types'
import { WeeklyClient } from './weekly-client'

export interface DayActivity {
  date: string
  dayName: string
  tasks: {
    id: string
    title: string
    status: string
    priority: string
    assignedTo: string
    athleteName: string | null
  }[]
  communications: {
    id: string
    type: string
    subject: string | null
    staffName: string
    athleteName: string | null
  }[]
  followUps: {
    id: string
    subject: string | null
    athleteName: string | null
    staffName: string
  }[]
}

export default async function WeeklyPage() {
  const supabase = await createClient()

  // Get current user and check if admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('google_sso_id', user?.id || '')
    .single()

  const typedCurrentUser = currentUser as User | null
  if (!typedCurrentUser || typedCurrentUser.role !== 'admin') {
    redirect('/dashboard')
  }

  // Calculate week range (Sunday to Saturday)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  // Get all staff members
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .order('name')

  type UserRow = { id: string; name: string }
  const typedUsers = (users || []) as UserRow[]
  const userMap = new Map(typedUsers.map(u => [u.id, u.name]))

  // Get tasks due this week
  type TaskRow = {
    id: string
    title: string
    status: string
    priority: string
    assigned_to: string
    due_date: string | null
    athlete_id: string | null
    athletes: { name: string } | null
  }
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('id, title, status, priority, assigned_to, due_date, athlete_id, athletes:athlete_id(name)')
    .gte('due_date', startOfWeek.toISOString().split('T')[0])
    .lte('due_date', endOfWeek.toISOString().split('T')[0])
    .order('due_date')

  const tasks = (tasksData || []) as TaskRow[]

  // Get communications this week
  type CommRow = {
    id: string
    type: string
    subject: string | null
    communication_date: string
    staff_member_id: string
    athlete_id: string
    athletes: { name: string } | null
  }
  const { data: commsData } = await supabase
    .from('communications_log')
    .select('id, type, subject, communication_date, staff_member_id, athlete_id, athletes:athlete_id(name)')
    .gte('communication_date', startOfWeek.toISOString().split('T')[0])
    .lte('communication_date', endOfWeek.toISOString().split('T')[0])
    .order('communication_date')

  const comms = (commsData || []) as CommRow[]

  // Get follow-ups this week
  type FollowUpRow = {
    id: string
    subject: string | null
    follow_up_date: string
    staff_member_id: string
    athletes: { name: string } | null
  }
  const { data: followUpsData } = await supabase
    .from('communications_log')
    .select('id, subject, follow_up_date, staff_member_id, athletes:athlete_id(name)')
    .gte('follow_up_date', startOfWeek.toISOString().split('T')[0])
    .lte('follow_up_date', endOfWeek.toISOString().split('T')[0])
    .eq('follow_up_completed', false)
    .order('follow_up_date')

  const followUps = (followUpsData || []) as FollowUpRow[]

  // Build day-by-day data
  const days: DayActivity[] = []
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    const dayTasks = tasks
      .filter(t => t.due_date === dateStr)
      .map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignedTo: userMap.get(t.assigned_to) || 'Unknown',
        athleteName: t.athletes?.name || null,
      }))

    const dayComms = comms
      .filter(c => c.communication_date === dateStr)
      .map(c => ({
        id: c.id,
        type: c.type,
        subject: c.subject,
        staffName: userMap.get(c.staff_member_id) || 'Unknown',
        athleteName: c.athletes?.name || null,
      }))

    const dayFollowUps = followUps
      .filter(f => f.follow_up_date === dateStr)
      .map(f => ({
        id: f.id,
        subject: f.subject,
        athleteName: f.athletes?.name || null,
        staffName: userMap.get(f.staff_member_id) || 'Unknown',
      }))

    days.push({
      date: dateStr,
      dayName: dayNames[i],
      tasks: dayTasks,
      communications: dayComms,
      followUps: dayFollowUps,
    })
  }

  const weekLabel = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return <WeeklyClient days={days} weekLabel={weekLabel} />
}
