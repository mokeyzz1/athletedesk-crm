import { createClient } from '@/lib/supabase/server'

export interface GoalProgress {
  goalId: string
  goalName: string
  metric: string
  period: string
  targetCount: number
  currentCount: number
  progress: number // 0-100
  staffId: string | null
  staffName: string | null
  targetRole: string | null
}

export interface UserGoalProgress {
  userId: string
  userName: string
  goals: GoalProgress[]
  overallProgress: number // average of all goals
}

interface OutreachGoal {
  id: string
  name: string
  metric: string
  target_count: number
  period: string
  staff_id: string | null
  target_role: string | null
  is_active: boolean
  staff: { id: string; name: string } | null
}

interface CommRow {
  staff_member_id: string
  type: string
  communication_date: string
}

interface UserRow {
  id: string
  name: string
  role: string
}

export async function getGoalProgressForUser(userId: string): Promise<GoalProgress[]> {
  const supabase = await createClient()

  // Get user details
  const { data: userData } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('id', userId)
    .single()

  if (!userData) return []

  const user = userData as UserRow

  // Get active goals that apply to this user
  const { data: goalsData } = await supabase
    .from('outreach_goals')
    .select('*, staff:staff_id(id, name)')
    .eq('is_active', true)

  const goals = (goalsData || []) as OutreachGoal[]

  // Filter goals that apply to this user
  const applicableGoals = goals.filter(goal => {
    // Specific staff member
    if (goal.staff_id === userId) return true
    // Role-based
    if (goal.target_role === user.role && !goal.staff_id) return true
    // All staff (no specific staff or role)
    if (!goal.staff_id && !goal.target_role) return true
    return false
  })

  if (applicableGoals.length === 0) return []

  // Calculate date ranges
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Get user's communications
  const { data: commsData } = await supabase
    .from('communications_log')
    .select('staff_member_id, type, communication_date')
    .eq('staff_member_id', userId)
    .gte('communication_date', monthStart.toISOString())

  const comms = (commsData || []) as CommRow[]

  // Calculate progress for each goal
  return applicableGoals.map(goal => {
    const startDate = goal.period === 'weekly' ? weekStart : monthStart

    // Filter comms based on metric and date
    const filteredComms = comms.filter(c => {
      const commDate = new Date(c.communication_date)
      if (commDate < startDate) return false

      if (goal.metric === 'all_communications') return true
      if (goal.metric === 'emails' && c.type === 'email') return true
      if (goal.metric === 'calls' && c.type === 'call') return true
      if (goal.metric === 'texts' && c.type === 'text') return true
      return false
    })

    const currentCount = filteredComms.length
    const progress = Math.min(100, Math.round((currentCount / goal.target_count) * 100))

    return {
      goalId: goal.id,
      goalName: goal.name,
      metric: goal.metric,
      period: goal.period,
      targetCount: goal.target_count,
      currentCount,
      progress,
      staffId: goal.staff_id,
      staffName: goal.staff?.name || null,
      targetRole: goal.target_role,
    }
  })
}

export async function getAllUsersGoalProgress(): Promise<UserGoalProgress[]> {
  const supabase = await createClient()

  // Get all users
  const { data: usersData } = await supabase
    .from('users')
    .select('id, name, role')
    .order('name')

  const users = (usersData || []) as UserRow[]

  // Get active goals
  const { data: goalsData } = await supabase
    .from('outreach_goals')
    .select('*, staff:staff_id(id, name)')
    .eq('is_active', true)

  const goals = (goalsData || []) as OutreachGoal[]

  if (goals.length === 0) return []

  // Calculate date ranges
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Get all communications for this period
  const { data: commsData } = await supabase
    .from('communications_log')
    .select('staff_member_id, type, communication_date')
    .gte('communication_date', monthStart.toISOString())

  const comms = (commsData || []) as CommRow[]

  // Calculate progress for each user
  return users.map(user => {
    // Find applicable goals for this user
    const applicableGoals = goals.filter(goal => {
      if (goal.staff_id === user.id) return true
      if (goal.target_role === user.role && !goal.staff_id) return true
      if (!goal.staff_id && !goal.target_role) return true
      return false
    })

    const userComms = comms.filter(c => c.staff_member_id === user.id)

    const goalProgressList = applicableGoals.map(goal => {
      const startDate = goal.period === 'weekly' ? weekStart : monthStart

      const filteredComms = userComms.filter(c => {
        const commDate = new Date(c.communication_date)
        if (commDate < startDate) return false

        if (goal.metric === 'all_communications') return true
        if (goal.metric === 'emails' && c.type === 'email') return true
        if (goal.metric === 'calls' && c.type === 'call') return true
        if (goal.metric === 'texts' && c.type === 'text') return true
        return false
      })

      const currentCount = filteredComms.length
      const progress = Math.min(100, Math.round((currentCount / goal.target_count) * 100))

      return {
        goalId: goal.id,
        goalName: goal.name,
        metric: goal.metric,
        period: goal.period,
        targetCount: goal.target_count,
        currentCount,
        progress,
        staffId: goal.staff_id,
        staffName: goal.staff?.name || null,
        targetRole: goal.target_role,
      }
    })

    const overallProgress = goalProgressList.length > 0
      ? Math.round(goalProgressList.reduce((sum, g) => sum + g.progress, 0) / goalProgressList.length)
      : 0

    return {
      userId: user.id,
      userName: user.name,
      goals: goalProgressList,
      overallProgress,
    }
  }).filter(u => u.goals.length > 0) // Only include users with applicable goals
}

export async function getTeamGoalsSummary(): Promise<{
  totalGoals: number
  averageProgress: number
  usersOnTrack: number
  totalUsers: number
}> {
  const allProgress = await getAllUsersGoalProgress()

  if (allProgress.length === 0) {
    return {
      totalGoals: 0,
      averageProgress: 0,
      usersOnTrack: 0,
      totalUsers: 0,
    }
  }

  const totalGoals = allProgress.reduce((sum, u) => sum + u.goals.length, 0)
  const averageProgress = Math.round(
    allProgress.reduce((sum, u) => sum + u.overallProgress, 0) / allProgress.length
  )
  const usersOnTrack = allProgress.filter(u => u.overallProgress >= 80).length

  return {
    totalGoals,
    averageProgress,
    usersOnTrack,
    totalUsers: allProgress.length,
  }
}
