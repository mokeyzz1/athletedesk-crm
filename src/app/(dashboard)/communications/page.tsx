import { createClient } from '@/lib/supabase/server'
import type { CommunicationLog } from '@/lib/database.types'
import { CommunicationsClient } from './communications-client'

interface CommunicationWithRelations extends CommunicationLog {
  athletes: { id: string; name: string } | null
  users: { id: string; name: string } | null
}

export default async function CommunicationsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('communications_log')
    .select(`
      *,
      athletes (id, name),
      users:staff_member_id (id, name)
    `)
    .order('communication_date', { ascending: false })

  const communications = data as CommunicationWithRelations[] | null

  return <CommunicationsClient communications={communications} />
}
