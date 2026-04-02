import { createClient } from '@/lib/supabase/server'
import { RecruitingClient } from './recruiting-client'
import type { Athlete, OutreachStatus, ClassYear } from '@/lib/database.types'
import { getAthleteEmailCounts } from '@/lib/queries/email-stats'

export interface RecruitingAthlete {
  id: string
  name: string
  sport: string
  school: string | null
  position: string | null
  class_year: ClassYear
  region: string | null
  outreach_status: OutreachStatus
  last_contacted_date: string | null
  email: string | null
  phone: string | null
  marketability_score: number | null
  emailCount: number
}

export interface RegionStats {
  region: string
  total: number
  contacted: number
  percentage: number
}

export default async function RecruitingPage() {
  const supabase = await createClient()

  // Get all non-signed athletes (prospects in recruiting database)
  const { data: athletesData } = await supabase
    .from('athletes')
    .select('id, name, sport, school, position, class_year, region, outreach_status, last_contacted_date, email, phone, marketability_score')
    .neq('outreach_status', 'signed')
    .order('name')

  const typedAthletesData = (athletesData || []) as Athlete[]
  const athleteIds = typedAthletesData.map(a => a.id)
  const emailCounts = athleteIds.length > 0 ? await getAthleteEmailCounts(athleteIds) : {}

  const athletes: RecruitingAthlete[] = typedAthletesData.map(a => ({
    id: a.id,
    name: a.name,
    sport: a.sport,
    school: a.school,
    position: a.position,
    class_year: a.class_year || 'n_a',
    region: a.region,
    outreach_status: a.outreach_status || 'not_contacted',
    last_contacted_date: a.last_contacted_date,
    email: a.email,
    phone: a.phone,
    marketability_score: a.marketability_score,
    emailCount: emailCounts[a.id] || 0,
  }))

  // Calculate region stats
  const regionMap = new Map<string, { total: number; contacted: number }>()

  athletes.forEach(a => {
    const region = a.region || 'Unassigned'
    const current = regionMap.get(region) || { total: 0, contacted: 0 }
    current.total++
    if (a.outreach_status !== 'not_contacted') {
      current.contacted++
    }
    regionMap.set(region, current)
  })

  const regionStats: RegionStats[] = Array.from(regionMap.entries()).map(([region, stats]) => ({
    region,
    total: stats.total,
    contacted: stats.contacted,
    percentage: stats.total > 0 ? Math.round((stats.contacted / stats.total) * 100) : 0,
  })).sort((a, b) => a.region.localeCompare(b.region))

  return <RecruitingClient athletes={athletes} regionStats={regionStats} />
}
