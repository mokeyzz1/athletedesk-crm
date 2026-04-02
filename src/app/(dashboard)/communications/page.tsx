import { createClient } from '@/lib/supabase/server'
import type { CommunicationLog, Athlete } from '@/lib/database.types'
import { CommunicationsClient } from './communications-client'

interface CommunicationWithRelations extends CommunicationLog {
  athletes: { id: string; name: string } | null
  users: { id: string; name: string } | null
}

export default async function CommunicationsPage() {
  const supabase = await createClient()

  const [communicationsResult, athletesResult] = await Promise.all([
    supabase
      .from('communications_log')
      .select(`
        *,
        athletes (id, name),
        users:staff_member_id (id, name)
      `)
      .order('communication_date', { ascending: false }),
    supabase
      .from('athletes')
      .select('*')
      .order('name')
  ])

  const communications = communicationsResult.data as CommunicationWithRelations[] | null
  const athletes = (athletesResult.data as Athlete[]) || []

  return <CommunicationsClient communications={communications} athletes={athletes} />
}
