import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { RecruitingRegion, User } from '@/lib/database.types'
import { ProductivityClient } from './productivity-client'
import { isOverdue } from '@/lib/helpers'
import { getPrimaryRole, isAdminLike } from '@/lib/roles'

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
    .eq('auth_user_id', user?.id || '')
    .single()

  const typedCurrentUser = currentUser as User | null
  if (!isAdminLike(typedCurrentUser)) {
    redirect('/dashboard')
  }

  // Calculate date ranges
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Limit comms query to last 3 months for performance
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  // PARALLEL: Fetch all data simultaneously
  type CommRow = { staff_member_id: string; type: string; communication_date: string; athlete_id: string }
  type TaskRow = { assigned_to: string; status: string; due_date: string | null; updated_at: string }
  type AthleteRow = {
    id: string
    name: string
    sport: string
    assigned_scout_id: string | null
    assigned_agent_id: string | null
    assigned_marketing_lead_id: string | null
  }

  const [usersResult, commsResult, tasksResult, athletesResult, regionsResult] = await Promise.all([
    supabase.from('users').select('*').order('name'),
    supabase.from('communications_log').select('staff_member_id, type, communication_date, athlete_id').gte('communication_date', threeMonthsAgo.toISOString()),
    supabase.from('tasks').select('assigned_to, status, due_date, updated_at'),
    supabase.from('athletes').select('id, name, sport, assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id'),
    supabase.from('recruiting_regions').select('name').order('name'),
  ])

  const staffList = (usersResult.data || []) as User[]
  const staffIds = staffList.map(s => s.id)
  const comms = (commsResult.data || []) as CommRow[]
  const tasks = (tasksResult.data || []) as TaskRow[]
  const allAthletes = (athletesResult.data || []) as AthleteRow[]
  const availableRegions = ((regionsResult.data as Pick<RecruitingRegion, 'name'>[] | null) || []).map(r => r.name)

  // PRE-BUILD LOOKUP MAPS for O(1) access instead of O(n) filtering

  // Communications by staff ID
  const commsByStaff = new Map<string, CommRow[]>()
  staffIds.forEach(id => commsByStaff.set(id, []))
  comms.forEach(c => {
    const list = commsByStaff.get(c.staff_member_id)
    if (list) list.push(c)
  })

  // Tasks by staff ID
  const tasksByStaff = new Map<string, TaskRow[]>()
  staffIds.forEach(id => tasksByStaff.set(id, []))
  tasks.forEach(t => {
    const list = tasksByStaff.get(t.assigned_to)
    if (list) list.push(t)
  })

  // Athletes managed count by staff ID
  const athleteCountByStaff = new Map<string, number>()
  staffIds.forEach(id => athleteCountByStaff.set(id, 0))
  allAthletes.forEach(a => {
    if (a.assigned_scout_id) athleteCountByStaff.set(a.assigned_scout_id, (athleteCountByStaff.get(a.assigned_scout_id) || 0) + 1)
    if (a.assigned_agent_id) athleteCountByStaff.set(a.assigned_agent_id, (athleteCountByStaff.get(a.assigned_agent_id) || 0) + 1)
    if (a.assigned_marketing_lead_id) athleteCountByStaff.set(a.assigned_marketing_lead_id, (athleteCountByStaff.get(a.assigned_marketing_lead_id) || 0) + 1)
  })

  // Build map of staff ID -> assigned athletes (for UI display)
  const staffAthleteMap: Record<string, { id: string; name: string; sport: string; role: string }[]> = {}
  staffIds.forEach(id => { staffAthleteMap[id] = [] })
  allAthletes.forEach(athlete => {
    if (athlete.assigned_scout_id && staffAthleteMap[athlete.assigned_scout_id]) {
      staffAthleteMap[athlete.assigned_scout_id].push({ id: athlete.id, name: athlete.name, sport: athlete.sport, role: 'Scout' })
    }
    if (athlete.assigned_agent_id && staffAthleteMap[athlete.assigned_agent_id]) {
      staffAthleteMap[athlete.assigned_agent_id].push({ id: athlete.id, name: athlete.name, sport: athlete.sport, role: 'Agent' })
    }
    if (athlete.assigned_marketing_lead_id && staffAthleteMap[athlete.assigned_marketing_lead_id]) {
      staffAthleteMap[athlete.assigned_marketing_lead_id].push({ id: athlete.id, name: athlete.name, sport: athlete.sport, role: 'Marketing' })
    }
  })

  // Calculate metrics per staff member using pre-built maps
  const productivity: StaffProductivity[] = staffList.map(staff => {
    const staffComms = commsByStaff.get(staff.id) || []
    const staffTasks = tasksByStaff.get(staff.id) || []

    // Pre-filter emails once
    const staffEmails = staffComms.filter(c => c.type === 'email')

    // Calculate email metrics
    let emailsThisWeek = 0, emailsThisMonth = 0
    staffEmails.forEach(c => {
      const date = new Date(c.communication_date)
      if (date >= weekStart) emailsThisWeek++
      if (date >= monthStart) emailsThisMonth++
    })

    // Calculate comm metrics
    let commsThisWeek = 0, commsThisMonth = 0
    const contactedAthletesThisWeek = new Set<string>()
    staffComms.forEach(c => {
      const date = new Date(c.communication_date)
      if (date >= weekStart) {
        commsThisWeek++
        contactedAthletesThisWeek.add(c.athlete_id)
      }
      if (date >= monthStart) commsThisMonth++
    })

    // Calculate task metrics
    let tasksCompleted = 0, tasksPending = 0, tasksOverdue = 0
    staffTasks.forEach(t => {
      if (t.status === 'done') {
        tasksCompleted++
      } else {
        tasksPending++
        if (t.due_date && isOverdue(t.due_date)) tasksOverdue++
      }
    })

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: getPrimaryRole(staff),
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
      athletesManaged: athleteCountByStaff.get(staff.id) || 0,
      contactedThisWeek: contactedAthletesThisWeek.size,
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
      availableRegions={availableRegions}
    />
  )
}
