import { createClient } from '@/lib/supabase/server'
import { AnalyticsClient } from './analytics-client'
import type { OutreachStatus, UserRole, PipelineStage, DealType, PaymentStatus } from '@/lib/database.types'

// Types for query results
type StatusCount = { outreach_status: OutreachStatus }
type ClassYearRow = { class_year: string | null }
type RegionRow = { region: string | null; outreach_status: OutreachStatus }
type StaffCommRow = { staff_member_id: string }
type UserRow = { id: string; name: string; role: UserRole }
type AssignmentRow = { assigned_scout_id: string | null; assigned_agent_id: string | null; assigned_marketing_lead_id: string | null }
type ActivityRow = { staff_member_id: string; communication_date: string }
type RevenueRow = { deal_value: number | null; deal_type: DealType; payment_status: PaymentStatus; deal_date: string }
type PipelineRow = { pipeline_stage: PipelineStage }
type StaleAthleteRow = { id: string; name: string; outreach_status: OutreachStatus; updated_at: string; region: string | null }
type GoalRow = { id: string; staff_id: string | null; target_count: number; period: string }

type TimeRange = 'week' | 'month' | '3months' | 'all'

function getDateRanges(range: TimeRange) {
  const now = new Date()

  // Start of current period
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - now.getDay())
  startOfThisWeek.setHours(0, 0, 0, 0)

  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  // Calculate period start based on range
  let periodStart: Date
  let previousPeriodStart: Date
  let revenueStart: Date

  switch (range) {
    case 'week':
      periodStart = startOfThisWeek
      previousPeriodStart = startOfLastWeek
      revenueStart = new Date(now)
      revenueStart.setDate(revenueStart.getDate() - 7)
      break
    case 'month':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      revenueStart = new Date(now)
      revenueStart.setMonth(revenueStart.getMonth() - 6)
      break
    case '3months':
      periodStart = new Date(now)
      periodStart.setMonth(periodStart.getMonth() - 3)
      previousPeriodStart = new Date(periodStart)
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 3)
      revenueStart = new Date(now)
      revenueStart.setMonth(revenueStart.getMonth() - 12)
      break
    case 'all':
    default:
      periodStart = new Date('2020-01-01')
      previousPeriodStart = new Date('2019-01-01')
      revenueStart = new Date('2020-01-01')
      break
  }

  return {
    now,
    startOfThisWeek,
    startOfLastWeek,
    periodStart,
    previousPeriodStart,
    revenueStart,
  }
}

interface PageProps {
  searchParams: Promise<{ range?: string }>
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams
  const range = (params.range as TimeRange) || 'month'

  const { startOfThisWeek, startOfLastWeek, periodStart, revenueStart } = getDateRanges(range)

  // Date calculations
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  // PARALLEL: Run all independent queries simultaneously
  const [
    totalProspectsResult,
    statusCountsResult,
    classYearResult,
    regionResult,
    contactedThisPeriodResult,
    contactedLastPeriodResult,
    staffCommsResult,
    usersResult,
    assignmentResult,
    lastActivityResult,
    goalsResult,
    revenueResult,
    pipelineResult,
    staleAthletesResult,
  ] = await Promise.all([
    // 1. RECRUITING OVERVIEW
    supabase.from('athletes').select('*', { count: 'exact', head: true }).neq('outreach_status', 'signed'),
    supabase.from('athletes').select('outreach_status'),
    supabase.from('athletes').select('class_year').neq('outreach_status', 'signed'),
    supabase.from('athletes').select('region, outreach_status').neq('outreach_status', 'signed'),
    supabase.from('athletes').select('*', { count: 'exact', head: true }).gte('last_contacted_date', periodStart.toISOString().split('T')[0]),
    supabase.from('athletes').select('*', { count: 'exact', head: true }).gte('last_contacted_date', startOfLastWeek.toISOString().split('T')[0]).lt('last_contacted_date', startOfThisWeek.toISOString().split('T')[0]),
    // 2. TEAM PERFORMANCE
    supabase.from('communications_log').select('staff_member_id').gte('communication_date', periodStart.toISOString()),
    supabase.from('users').select('id, name, role').in('role', ['admin', 'agent', 'scout', 'marketing']),
    supabase.from('athletes').select('assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id'),
    // Last activity: only fetch recent (1 week) for performance - older = inactive anyway
    supabase.from('communications_log').select('staff_member_id, communication_date').gte('communication_date', oneWeekAgo.toISOString()).order('communication_date', { ascending: false }),
    supabase.from('outreach_goals').select('id, staff_id, target_count, period').eq('is_active', true),
    // 3. REVENUE
    supabase.from('financial_tracking').select('deal_value, deal_type, payment_status, deal_date').eq('deal_stage', 'active').gte('deal_date', revenueStart.toISOString().split('T')[0]),
    // 4. PIPELINE
    supabase.from('recruiting_pipeline').select('pipeline_stage'),
    supabase.from('athletes').select('id, name, outreach_status, updated_at, region').neq('outreach_status', 'signed').neq('outreach_status', 'dead_lead').lt('updated_at', twoWeeksAgo.toISOString()).order('updated_at', { ascending: true }).limit(10),
  ])

  // Extract results
  const totalProspects = totalProspectsResult.count
  const statusCounts = statusCountsResult.data as StatusCount[] | null
  const classYearData = classYearResult.data as ClassYearRow[] | null
  const regionData = regionResult.data as RegionRow[] | null
  const contactedThisPeriod = contactedThisPeriodResult.count
  const contactedLastPeriod = contactedLastPeriodResult.count
  const staffComms = staffCommsResult.data as StaffCommRow[] | null
  const users = usersResult.data as UserRow[] | null
  const assignmentData = assignmentResult.data as AssignmentRow[] | null
  const lastActivity = lastActivityResult.data as ActivityRow[] | null
  const goalsData = goalsResult.data as GoalRow[] | null
  const revenueData = revenueResult.data as RevenueRow[] | null
  const pipelineData = pipelineResult.data as PipelineRow[] | null
  const staleAthletes = staleAthletesResult.data as StaleAthleteRow[] | null

  // Process outreach funnel
  const outreachFunnel = {
    not_contacted: 0,
    contacted: 0,
    in_conversation: 0,
    interested: 0,
    signed: 0,
    dead_lead: 0,
    circling_back: 0,
  }
  statusCounts?.forEach(a => {
    const status = a.outreach_status as keyof typeof outreachFunnel
    if (status in outreachFunnel) outreachFunnel[status]++
  })

  // Process class year counts
  const classYearCounts: Record<string, number> = {}
  classYearData?.forEach(a => {
    const year = a.class_year || 'n_a'
    classYearCounts[year] = (classYearCounts[year] || 0) + 1
  })

  // Process region stats
  const regionStats: Record<string, { total: number; contacted: number }> = {}
  regionData?.forEach(a => {
    const region = a.region || 'Unassigned'
    if (!regionStats[region]) regionStats[region] = { total: 0, contacted: 0 }
    regionStats[region].total++
    if (a.outreach_status !== 'not_contacted') regionStats[region].contacted++
  })

  // Process comms per staff
  const commsPerStaff: Record<string, number> = {}
  staffComms?.forEach(c => {
    commsPerStaff[c.staff_member_id] = (commsPerStaff[c.staff_member_id] || 0) + 1
  })

  // Process assignments per user
  const assignmentsPerUser: Record<string, number> = {}
  assignmentData?.forEach(a => {
    if (a.assigned_scout_id) assignmentsPerUser[a.assigned_scout_id] = (assignmentsPerUser[a.assigned_scout_id] || 0) + 1
    if (a.assigned_agent_id) assignmentsPerUser[a.assigned_agent_id] = (assignmentsPerUser[a.assigned_agent_id] || 0) + 1
    if (a.assigned_marketing_lead_id) assignmentsPerUser[a.assigned_marketing_lead_id] = (assignmentsPerUser[a.assigned_marketing_lead_id] || 0) + 1
  })

  // Process last activity per user
  const lastActivityPerUser: Record<string, string> = {}
  lastActivity?.forEach(c => {
    if (!lastActivityPerUser[c.staff_member_id]) {
      lastActivityPerUser[c.staff_member_id] = c.communication_date
    }
  })

  // Process revenue data
  const revenueByMonth: Record<string, number> = {}
  const revenueByType: Record<string, number> = { revenue_share: 0, marketing_brand: 0 }
  const paymentStatus: Record<string, number> = { pending: 0, invoiced: 0, paid: 0 }
  revenueData?.forEach(d => {
    const month = d.deal_date.substring(0, 7)
    revenueByMonth[month] = (revenueByMonth[month] || 0) + (d.deal_value || 0)
    if (d.deal_type in revenueByType) revenueByType[d.deal_type] = (revenueByType[d.deal_type] || 0) + (d.deal_value || 0)
    if (d.payment_status in paymentStatus) paymentStatus[d.payment_status] = (paymentStatus[d.payment_status] || 0) + (d.deal_value || 0)
  })

  // Process pipeline counts
  const pipelineCounts: Record<string, number> = {
    prospect_identified: 0,
    scout_evaluation: 0,
    initial_contact: 0,
    recruiting_conversation: 0,
    interested: 0,
    signing_in_progress: 0,
    signed_client: 0,
  }
  pipelineData?.forEach(p => {
    const stage = p.pipeline_stage as keyof typeof pipelineCounts
    if (stage in pipelineCounts) pipelineCounts[stage]++
  })

  return (
    <AnalyticsClient
      recruitingData={{
        totalProspects: totalProspects || 0,
        outreachFunnel,
        classYearCounts,
        regionStats,
        contactedThisWeek: contactedThisPeriod || 0,
        contactedLastWeek: contactedLastPeriod || 0,
      }}
      teamData={{
        users: users || [],
        commsPerStaff,
        assignmentsPerUser,
        lastActivityPerUser,
        goals: goalsData || [],
      }}
      revenueData={{
        byMonth: revenueByMonth,
        byType: revenueByType,
        paymentStatus,
      }}
      pipelineData={{
        stageCounts: pipelineCounts,
        staleAthletes: staleAthletes || [],
      }}
    />
  )
}
