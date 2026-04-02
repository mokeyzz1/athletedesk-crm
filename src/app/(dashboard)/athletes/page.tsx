import { createClient } from '@/lib/supabase/server'
import { AthletesClient } from './athletes-client'
import type { OutreachStatus, ClassYear } from '@/lib/database.types'

export interface AllAthlete {
  id: string
  name: string
  email: string | null
  phone: string | null
  sport: string
  school: string | null
  position: string | null
  class_year: ClassYear
  region: string | null
  outreach_status: OutreachStatus
  last_contacted_date: string | null
  marketability_score: number | null
  created_at: string
}

export default async function AthletesPage() {
  const supabase = await createClient()

  // Get ALL athletes (both recruiting and roster)
  const { data } = await supabase
    .from('athletes')
    .select('id, name, email, phone, sport, school, position, class_year, region, outreach_status, last_contacted_date, marketability_score, created_at')
    .order('created_at', { ascending: false })

  const athletes: AllAthlete[] = (data || []).map(a => ({
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone,
    sport: a.sport,
    school: a.school,
    position: a.position,
    class_year: a.class_year || 'n_a',
    region: a.region,
    outreach_status: a.outreach_status || 'not_contacted',
    last_contacted_date: a.last_contacted_date,
    marketability_score: a.marketability_score,
    created_at: a.created_at,
  }))

  return <AthletesClient athletes={athletes} />
}
