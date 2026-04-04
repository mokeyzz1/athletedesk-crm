import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@/lib/database.types'
import { ProductivityClient } from './productivity-client'

interface StaffProductivity {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string | null
  assigned_regions: string[]
  // Email metrics
  emailsThisWeek: number
  emailsThisMonth: number
  emailsAllTime: number
  // Communication metrics
  commsThisWeek: number
  commsThisMonth: number
  commsAllTime: number
  // Task metrics
  tasksCompleted: number
  tasksPending: number
  tasksOverdue: number
  // Athlete counts
  athletesManaged: number
  contactedThisWeek: number
}

export default async function ProductivityPage() {
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

  // Get all staff members
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('name')

  const staffList = (users || []) as User[]
  const staffIds = staffList.map(s => s.id)

  // Calculate date ranges
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get all communications
  type CommRow = { staff_member_id: string; type: string; communication_date: string; athlete_id: string }
  const { data: commsData } = await supabase
    .from('communications_log')
    .select('staff_member_id, type, communication_date, athlete_id')
    .in('staff_member_id', staffIds.length > 0 ? staffIds : ['00000000-0000-0000-0000-000000000000'])

  const comms = (commsData || []) as CommRow[]

  // Get all tasks
  type TaskRow = { assigned_to: string; status: string; due_date: string | null; updated_at: string }
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('assigned_to, status, due_date, updated_at')
    .in('assigned_to', staffIds.length > 0 ? staffIds : ['00000000-0000-0000-0000-000000000000'])

  const tasks = (tasksData || []) as TaskRow[]

  // Get athlete assignments with details
  type AthleteRow = {
    id: string
    name: string
    sport: string
    assigned_scout_id: string | null
    assigned_agent_id: string | null
    assigned_marketing_lead_id: string | null
  }
  const { data: athletesData } = await supabase
    .from('athletes')
    .select('id, name, sport, assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id')

  const allAthletes = (athletesData || []) as AthleteRow[]

  // Build map of staff ID -> assigned athletes
  const staffAthleteMap: Record<string, { id: string; name: string; sport: string; role: string }[]> = {}
  staffIds.forEach(id => { staffAthleteMap[id] = [] })

  allAthletes.forEach(athlete => {
    if (athlete.assigned_scout_id && staffAthleteMap[athlete.assigned_scout_id]) {
      staffAthleteMap[athlete.assigned_scout_id].push({
        id: athlete.id,
        name: athlete.name,
        sport: athlete.sport,
        role: 'Scout'
      })
    }
    if (athlete.assigned_agent_id && staffAthleteMap[athlete.assigned_agent_id]) {
      staffAthleteMap[athlete.assigned_agent_id].push({
        id: athlete.id,
        name: athlete.name,
        sport: athlete.sport,
        role: 'Agent'
      })
    }
    if (athlete.assigned_marketing_lead_id && staffAthleteMap[athlete.assigned_marketing_lead_id]) {
      staffAthleteMap[athlete.assigned_marketing_lead_id].push({
        id: athlete.id,
        name: athlete.name,
        sport: athlete.sport,
        role: 'Marketing'
      })
    }
  })

  // For counting, use the old method
  const athleteAssignments = allAthletes

  // Calculate metrics per staff member
  const productivity: StaffProductivity[] = staffList.map(staff => {
    // Filter communications for this staff member
    const staffComms = comms.filter(c => c.staff_member_id === staff.id)
    const staffEmails = staffComms.filter(c => c.type === 'email')

    const emailsThisWeek = staffEmails.filter(c => new Date(c.communication_date) >= weekStart).length
    const emailsThisMonth = staffEmails.filter(c => new Date(c.communication_date) >= monthStart).length

    const commsThisWeek = staffComms.filter(c => new Date(c.communication_date) >= weekStart).length
    const commsThisMonth = staffComms.filter(c => new Date(c.communication_date) >= monthStart).length

    // Count unique athletes contacted this week
    const contactedThisWeek = new Set(
      staffComms
        .filter(c => new Date(c.communication_date) >= weekStart)
        .map(c => c.athlete_id)
    ).size

    // Filter tasks for this staff member
    const staffTasks = tasks.filter(t => t.assigned_to === staff.id)
    const tasksCompleted = staffTasks.filter(t => t.status === 'done').length
    const tasksPending = staffTasks.filter(t => t.status !== 'done').length
    const tasksOverdue = staffTasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      return new Date(t.due_date) < today
    }).length

    // Count athletes managed by this staff member
    const athletesManaged = athleteAssignments.filter(a =>
      a.assigned_scout_id === staff.id ||
      a.assigned_agent_id === staff.id ||
      a.assigned_marketing_lead_id === staff.id
    ).length

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      avatar_url: staff.avatar_url,
      assigned_regions: staff.assigned_regions || [],
      emailsThisWeek,
      emailsThisMonth,
      emailsAllTime: staffEmails.length,
      commsThisWeek,
      commsThisMonth,
      commsAllTime: staffComms.length,
      tasksCompleted,
      tasksPending,
      tasksOverdue,
      athletesManaged,
      contactedThisWeek,
    }
  })

  // Get unassigned athletes for assignment modal
  const unassignedAthletes = allAthletes.map(a => ({
    id: a.id,
    name: a.name,
    sport: a.sport,
    assigned_scout_id: a.assigned_scout_id,
    assigned_agent_id: a.assigned_agent_id,
    assigned_marketing_lead_id: a.assigned_marketing_lead_id,
  }))

  return (
    <ProductivityClient
      staffProductivity={productivity}
      staffAthleteMap={staffAthleteMap}
      allAthletes={unassignedAthletes}
    />
  )
}
