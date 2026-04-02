import { createClient } from '@/lib/supabase/server'
import { RosterClient } from './roster-client'
import type { DealType } from '@/lib/database.types'

export interface RosterAthlete {
  id: string
  name: string
  sport: string
  school: string | null
  position: string | null
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
}

export default async function RosterPage() {
  const supabase = await createClient()

  // Get athletes who are signed clients (pipeline_stage = 'signed_client')
  const { data: pipelineData } = await supabase
    .from('recruiting_pipeline')
    .select(`
      athlete_id,
      athletes (
        id,
        name,
        sport,
        school,
        position,
        social_media,
        assigned_agent_id,
        users!athletes_assigned_agent_id_fkey (
          name
        )
      )
    `)
    .eq('pipeline_stage', 'signed_client')

  // Flatten the data to get athletes array
  type AthleteFromQuery = {
    id: string
    name: string
    sport: string
    school: string | null
    position: string | null
    social_media: RosterAthlete['social_media']
    assigned_agent_id: string | null
    users: { name: string } | null
  }
  const athletes = (pipelineData?.map(p => p.athletes).filter(Boolean) || []) as AthleteFromQuery[]

  // Get deal summaries for signed athletes with deal_type
  const { data: deals } = await supabase
    .from('financial_tracking')
    .select('athlete_id, deal_value, deal_type')

  // Get brand outreach with closed deals (these are marketing_brand deals)
  const { data: brandDeals } = await supabase
    .from('brand_outreach')
    .select('athlete_id, deal_value')
    .eq('response_status', 'deal_closed')

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

  // Add financial tracking deals
  deals?.forEach(deal => {
    const summary = getOrCreate(deal.athlete_id)
    const dealType: DealType = deal.deal_type || 'marketing_brand'
    summary[dealType].total += deal.deal_value || 0
    summary[dealType].count += 1
  })

  // Add brand outreach deals (these are always marketing_brand type)
  brandDeals?.forEach(deal => {
    // Check if this deal is already tracked in financial_tracking to avoid double counting
    const existingInFinancial = deals?.some(d =>
      d.athlete_id === deal.athlete_id && d.deal_value === deal.deal_value
    )
    if (!existingInFinancial) {
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
      social_media: athlete.social_media,
      assigned_agent_id: athlete.assigned_agent_id,
      agent_name: athlete.users?.name || null,
      revenue_share_total: summary.revenue_share.total,
      revenue_share_count: summary.revenue_share.count,
      marketing_brand_total: summary.marketing_brand.total,
      marketing_brand_count: summary.marketing_brand.count,
      total_deal_value: summary.revenue_share.total + summary.marketing_brand.total,
      deal_count: summary.revenue_share.count + summary.marketing_brand.count,
    }
  })

  return <RosterClient athletes={rosterData} />
}
