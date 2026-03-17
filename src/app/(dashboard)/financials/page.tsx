import { createClient } from '@/lib/supabase/server'
import type { FinancialTracking } from '@/lib/database.types'
import { FinancialsClient } from './financials-client'

interface FinancialWithAthlete extends FinancialTracking {
  athletes: { id: string; name: string } | null
}

export default async function FinancialsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('financial_tracking')
    .select(`
      *,
      athletes (id, name)
    `)
    .order('deal_date', { ascending: false })

  const financials = data as FinancialWithAthlete[] | null

  return <FinancialsClient financials={financials} />
}
