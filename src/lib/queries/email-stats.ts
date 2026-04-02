import { createClient } from '@/lib/supabase/server'

export interface StaffEmailStats {
  staffId: string
  staffName: string
  thisWeek: number
  thisMonth: number
  allTime: number
}

export interface EmailStatsOverview {
  thisWeek: number
  thisMonth: number
  allTime: number
  byStaff: StaffEmailStats[]
}

interface EmailQueryResult {
  id: string
  communication_date: string
  staff_member_id: string
  users: { id: string; name: string } | null
}

export async function getEmailStatsOverview(): Promise<EmailStatsOverview> {
  const supabase = await createClient()

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Get all email communications with staff info
  const { data } = await supabase
    .from('communications_log')
    .select('id, communication_date, staff_member_id, users:staff_member_id(id, name)')
    .eq('type', 'email')
    .order('communication_date', { ascending: false })

  const emails = (data || []) as EmailQueryResult[]

  if (emails.length === 0) {
    return { thisWeek: 0, thisMonth: 0, allTime: 0, byStaff: [] }
  }

  // Calculate totals
  let thisWeek = 0
  let thisMonth = 0
  const allTime = emails.length

  const staffStats: Record<string, StaffEmailStats> = {}

  for (const email of emails) {
    const emailDate = new Date(email.communication_date)
    const staffId = email.staff_member_id
    const staffName = email.users?.name || 'Unknown'

    // Initialize staff record if needed
    if (!staffStats[staffId]) {
      staffStats[staffId] = {
        staffId,
        staffName,
        thisWeek: 0,
        thisMonth: 0,
        allTime: 0
      }
    }

    staffStats[staffId].allTime++

    if (emailDate >= weekStart) {
      thisWeek++
      staffStats[staffId].thisWeek++
    }

    if (emailDate >= monthStart) {
      thisMonth++
      staffStats[staffId].thisMonth++
    }
  }

  // Sort by allTime emails descending
  const byStaff = Object.values(staffStats).sort((a, b) => b.allTime - a.allTime)

  return { thisWeek, thisMonth, allTime, byStaff }
}

export async function getAthleteEmailCount(athleteId: string): Promise<number> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('communications_log')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', athleteId)
    .eq('type', 'email')

  return count || 0
}

export async function getAthleteEmailCounts(athleteIds: string[]): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('communications_log')
    .select('athlete_id')
    .eq('type', 'email')
    .in('athlete_id', athleteIds)

  const typedData = (data || []) as { athlete_id: string }[]

  const counts: Record<string, number> = {}

  // Initialize all athletes with 0
  for (const id of athleteIds) {
    counts[id] = 0
  }

  // Count emails per athlete
  for (const row of typedData) {
    counts[row.athlete_id] = (counts[row.athlete_id] || 0) + 1
  }

  return counts
}
