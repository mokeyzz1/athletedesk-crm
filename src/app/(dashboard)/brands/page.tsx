import { createClient } from '@/lib/supabase/server'
import type { BrandOutreach, Athlete } from '@/lib/database.types'
import { BrandsClient } from './brands-client'

interface BrandOutreachWithRelations extends BrandOutreach {
  athletes: { id: string; name: string } | null
  users: { id: string; name: string } | null
}

export default async function BrandsPage() {
  const supabase = await createClient()

  const [outreachResult, athletesResult] = await Promise.all([
    supabase
      .from('brand_outreach')
      .select(`
        *,
        athletes (id, name),
        users:staff_member_id (id, name)
      `)
      .order('date_contacted', { ascending: false }),
    supabase
      .from('athletes')
      .select('*')
      .order('name')
  ])

  const outreach = outreachResult.data as BrandOutreachWithRelations[] | null
  const athletes = (athletesResult.data as Athlete[]) || []

  return <BrandsClient outreach={outreach} athletes={athletes} />
}
