import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@/lib/database.types'
import { OutreachGoalsClient } from './outreach-goals-client'
import { userHasRole } from '@/lib/roles'

export interface OutreachGoal {
  id: string
  name: string
  description: string | null
  metric: 'emails' | 'calls' | 'texts' | 'all_communications'
  target_count: number
  period: 'weekly' | 'monthly'
  staff_id: string | null
  target_role: string | null
  is_active: boolean
  created_by: string
  created_at: string
  staff?: { id: string; name: string } | null
}

export default async function OutreachGoalsPage() {
  const supabase = await createClient()

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user?.id || '')
    .single()

  const typedCurrentUser = currentUser as User | null
  if (!userHasRole(typedCurrentUser, 'admin')) {
    redirect('/settings')
  }

  // Get all outreach goals
  const { data: goalsData } = await supabase
    .from('outreach_goals')
    .select('*, staff:staff_id(id, name)')
    .order('created_at', { ascending: false })

  const goals = (goalsData || []) as OutreachGoal[]

  // Get all staff members for dropdown
  const { data: staffData } = await supabase
    .from('users')
    .select('id, name, role, primary_role')
    .order('name')

  type StaffMember = { id: string; name: string; role: string; primary_role: string | null }
  const staff = ((staffData || []) as StaffMember[])
    .map(member => ({ ...member, role: member.primary_role || member.role }))

  return <OutreachGoalsClient goals={goals} staff={staff} />
}
