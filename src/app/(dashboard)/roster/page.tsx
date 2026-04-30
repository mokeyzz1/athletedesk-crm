import { createClient } from '@/lib/supabase/server'
import { RosterClient } from './roster-client'
import type { DealType, User } from '@/lib/database.types'
import { getAthleteEmailCounts } from '@/lib/queries/email-stats'
import { isAdminLike, hasAnyWorkRole } from '@/lib/roles'

export interface RosterAthlete {
  id: string
  name: string
  sport: string
  school: string | null
  position: string | null
  region: string | null
  social_media: {
    instagram_followers?: number
    twitter_followers?: number
    tiktok_followers?: number
    youtube_subscribers?: number
    nil_valuation?: number
  } | null
  assigned_agent_id: string | null
  agent_name: string | null
  // Two deal tracks
  revenue_share_total: number
  revenue_share_count: number
  marketing_brand_total: number
  marketing_brand_count: number
  total_deal_value: number
  deal_count: number
  emailCount: number
}

export default async function RosterPage() {
  const supabase = await createClient()

  // Get current user to check permissions
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser?.id || '')
    .single()

  const typedUser = currentUser as User | null
  // Admins, agents, and scouts can import athletes
  const canImport = isAdminLike(typedUser) || hasAnyWorkRole(typedUser, ['agent', 'scout'])

  // Get athletes who are signed (outreach_status = 'signed')
  const { data: athletesData } = await supabase
    .from('athletes')
    .select(`
      id,
      name,
      sport,
      school,
      position,
      region,
      social_media,
      assigned_agent_id,
      users!athletes_assigned_agent_id_fkey (
        name
      )
    `)
    .eq('outreach_status', 'signed')
    .order('name')

  type AthleteFromQuery = {
    id: string
    name: string
    sport: string
    school: string | null
    position: string | null
    region: string | null
    social_media: RosterAthlete['social_media']
    assigned_agent_id: string | null
    users: { name: string } | null
  }

  const athletes = (athletesData || []) as AthleteFromQuery[]
  const athleteIds = athletes.map(a => a.id)
  const safeAthleteIds = athleteIds.length > 0 ? athleteIds : ['00000000-0000-0000-0000-000000000000']

  type DealFromQuery = { athlete_id: string; deal_value: number | null; deal_type: DealType | null }
  type BrandDealFromQuery = { athlete_id: string; deal_value: number | null }

  // PARALLEL: Fetch email counts, deals, and brand deals simultaneously
  const [emailCounts, dealsResult, brandDealsResult] = await Promise.all([
    athleteIds.length > 0 ? getAthleteEmailCounts(athleteIds) : Promise.resolve({} as Record<string, number>),
    supabase
      .from('financial_tracking')
      .select('athlete_id, deal_value, deal_type')
      .in('athlete_id', safeAthleteIds),
    supabase
      .from('brand_outreach')
      .select('athlete_id, deal_value')
      .eq('response_status', 'deal_closed')
      .in('athlete_id', safeAthleteIds),
  ])

  const typedDeals = (dealsResult.data || []) as DealFromQuery[]
  const typedBrandDeals = (brandDealsResult.data || []) as BrandDealFromQuery[]

  // Calculate totals per athlete by deal type
  type DealSummary = {
    revenue_share: { total: number; count: number }
    marketing_brand: { total: number; count: number }
  }
  const dealSummary = new Map<string, DealSummary>()

  const getOrCreate = (athleteId: string): DealSummary => {
    if (!dealSummary.has(athleteId)) {
      dealSummary.set(athleteId, {
        revenue_share: { total: 0, count: 0 },
        marketing_brand: { total: 0, count: 0 },
      })
    }
    return dealSummary.get(athleteId)!
  }

  // Build a Set for O(1) duplicate checking instead of O(n) .some()
  const financialDealSet = new Set(
    typedDeals.map(d => `${d.athlete_id}-${d.deal_value}`)
  )

  // Add financial tracking deals
  typedDeals.forEach(deal => {
    const summary = getOrCreate(deal.athlete_id)
    const dealType: DealType = deal.deal_type || 'marketing_brand'
    summary[dealType].total += deal.deal_value || 0
    summary[dealType].count += 1
  })

  // Add brand outreach deals (these are always marketing_brand type)
  typedBrandDeals.forEach(deal => {
    // O(1) check if this deal is already tracked in financial_tracking
    if (!financialDealSet.has(`${deal.athlete_id}-${deal.deal_value}`)) {
      const summary = getOrCreate(deal.athlete_id)
      summary.marketing_brand.total += deal.deal_value || 0
      summary.marketing_brand.count += 1
    }
  })

  // Transform data for client
  const rosterData: RosterAthlete[] = athletes.map(athlete => {
    const summary = dealSummary.get(athlete.id) || {
      revenue_share: { total: 0, count: 0 },
      marketing_brand: { total: 0, count: 0 },
    }
    return {
      id: athlete.id,
      name: athlete.name,
      sport: athlete.sport,
      school: athlete.school,
      position: athlete.position,
      region: athlete.region,
      social_media: athlete.social_media,
      assigned_agent_id: athlete.assigned_agent_id,
      agent_name: athlete.users?.name || null,
      revenue_share_total: summary.revenue_share.total,
      revenue_share_count: summary.revenue_share.count,
      marketing_brand_total: summary.marketing_brand.total,
      marketing_brand_count: summary.marketing_brand.count,
      total_deal_value: summary.revenue_share.total + summary.marketing_brand.total,
      deal_count: summary.revenue_share.count + summary.marketing_brand.count,
      emailCount: emailCounts[athlete.id] || 0,
    }
  })

  return <RosterClient athletes={rosterData} canImport={canImport} />
}
