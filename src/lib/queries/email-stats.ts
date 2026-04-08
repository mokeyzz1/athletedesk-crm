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

export async function getEmailStatsOverview(): Promise<EmailStatsOverview> {
  const supabase = await createClient()

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Run all count queries in parallel using SQL aggregation
  const [allTimeResult, thisWeekResult, thisMonthResult, staffStatsResult] = await Promise.all([
    // All time count
    supabase
      .from('communications_log')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'email'),

    // This week count
    supabase
      .from('communications_log')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'email')
      .gte('communication_date', weekStart.toISOString()),

    // This month count
    supabase
      .from('communications_log')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'email')
      .gte('communication_date', monthStart.toISOString()),

    // Staff stats - get emails with staff info for grouping
    supabase
      .from('communications_log')
      .select('staff_member_id, communication_date, users:staff_member_id(id, name)')
      .eq('type', 'email')
  ])

  const allTime = allTimeResult.count || 0
  const thisWeek = thisWeekResult.count || 0
  const thisMonth = thisMonthResult.count || 0

  // Group staff stats in JS (but we're not fetching full records, just IDs and dates)
  type StaffRow = { staff_member_id: string; communication_date: string; users: { id: string; name: string } | null }
  const staffData = (staffStatsResult.data || []) as StaffRow[]

  const staffStats: Record<string, StaffEmailStats> = {}

  for (const row of staffData) {
    const staffId = row.staff_member_id
    if (!staffId) continue

    const staffName = row.users?.name || 'Unknown'
    const emailDate = new Date(row.communication_date)

    if (!staffStats[staffId]) {
      staffStats[staffId] = { staffId, staffName, thisWeek: 0, thisMonth: 0, allTime: 0 }
    }

    staffStats[staffId].allTime++
    if (emailDate >= weekStart) staffStats[staffId].thisWeek++
    if (emailDate >= monthStart) staffStats[staffId].thisMonth++
  }

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
  if (athleteIds.length === 0) return {}

  const supabase = await createClient()

  // Fetch only athlete_id for counting - minimal data transfer
  const { data } = await supabase
    .from('communications_log')
    .select('athlete_id')
    .eq('type', 'email')
    .in('athlete_id', athleteIds)

  const typedData = (data || []) as { athlete_id: string }[]

  // Use Map for O(1) lookups
  const counts = new Map<string, number>()

  // Count emails per athlete in single pass
  for (const row of typedData) {
    counts.set(row.athlete_id, (counts.get(row.athlete_id) || 0) + 1)
  }

  // Convert to record, defaulting missing IDs to 0
  const result: Record<string, number> = {}
  for (const id of athleteIds) {
    result[id] = counts.get(id) || 0
  }

  return result
}
