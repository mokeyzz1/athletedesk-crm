import { createClient } from '@/lib/supabase/server'
import type { BrandOutreach } from '@/lib/database.types'
import { BrandsClient } from './brands-client'

interface BrandOutreachWithRelations extends BrandOutreach {
  athletes: { id: string; name: string } | null
  users: { id: string; name: string } | null
}

export default async function BrandsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('brand_outreach')
    .select(`
      *,
      athletes (id, name),
      users:staff_member_id (id, name)
    `)
    .order('date_contacted', { ascending: false })

  const outreach = data as BrandOutreachWithRelations[] | null

  return <BrandsClient outreach={outreach} />
}
