import { createClient } from '@/lib/supabase/server'
import type { AthleteWithPipeline } from '@/lib/database.types'
import { AthletesClient } from './athletes-client'

export default async function AthletesPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('athletes_with_pipeline')
    .select('*')
    .order('created_at', { ascending: false })

  const athletes = data as AthleteWithPipeline[] | null

  return <AthletesClient athletes={athletes} />
}
