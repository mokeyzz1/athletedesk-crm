import { createClient } from '@/lib/supabase/server'
import { RosterClient } from './roster-client'

interface RosterAthlete {
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

  // Get deal summaries for signed athletes
  const { data: deals } = await supabase
    .from('financial_tracking')
    .select('athlete_id, deal_value')

  // Get brand outreach with closed deals
  const { data: brandDeals } = await supabase
    .from('brand_outreach')
    .select('athlete_id, deal_value')
    .eq('response_status', 'deal_closed')

  // Calculate totals per athlete
  const dealSummary = new Map<string, { total: number; count: number }>()

  // Add financial tracking deals
  deals?.forEach(deal => {
    const existing = dealSummary.get(deal.athlete_id) || { total: 0, count: 0 }
    existing.total += deal.deal_value || 0
    existing.count += 1
    dealSummary.set(deal.athlete_id, existing)
  })

  // Add brand outreach deals (avoid double counting if already in financial tracking)
  brandDeals?.forEach(deal => {
    if (!deals?.some(d => d.athlete_id === deal.athlete_id)) {
      const existing = dealSummary.get(deal.athlete_id) || { total: 0, count: 0 }
      existing.total += deal.deal_value || 0
      existing.count += 1
      dealSummary.set(deal.athlete_id, existing)
    }
  })

  // Transform data for client
  const rosterData: RosterAthlete[] = athletes.map(athlete => {
    const summary = dealSummary.get(athlete.id) || { total: 0, count: 0 }
    return {
      id: athlete.id,
      name: athlete.name,
      sport: athlete.sport,
      school: athlete.school,
      position: athlete.position,
      social_media: athlete.social_media,
      assigned_agent_id: athlete.assigned_agent_id,
      agent_name: athlete.users?.name || null,
      total_deal_value: summary.total,
      deal_count: summary.count,
    }
  })

  return <RosterClient athletes={rosterData} />
}
