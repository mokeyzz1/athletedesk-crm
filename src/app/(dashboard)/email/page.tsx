import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmailClient } from './email-client'
import type { User } from '@/lib/database.types'

export default async function EmailPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get current user
  const { data: currentUserData } = await supabase
    .from('users')
    .select('*')
    .or(`email.eq.${user.email},google_sso_id.eq.${user.id}`)
    .single()

  const currentUser = currentUserData as User | null
  if (!currentUser) {
    redirect('/login')
  }

  // Get email templates
  const { data: templatesData } = await supabase
    .from('email_templates')
    .select('*')
    .or(`created_by.eq.${currentUser.id},is_shared.eq.true`)
    .order('name')

  const templates = templatesData || []

  // Get athletes for filtering (only assigned athletes for non-admins)
  let athletesQuery = supabase
    .from('athletes')
    .select('id, name, email, sport')
    .order('name')

  if (currentUser.role !== 'admin') {
    athletesQuery = athletesQuery.or(
      `assigned_scout_id.eq.${currentUser.id},assigned_agent_id.eq.${currentUser.id},assigned_marketing_lead_id.eq.${currentUser.id}`
    )
  }

  const { data: athletesData } = await athletesQuery
  const athletes = athletesData || []

  // For admin, get all staff members
  let staffMembers: { id: string; name: string; gmail_email: string | null }[] = []
  if (currentUser.role === 'admin') {
    const { data: staffData } = await supabase
      .from('users')
      .select('id, name, gmail_email')
      .not('gmail_email', 'is', null)
      .order('name')

    staffMembers = (staffData || []) as { id: string; name: string; gmail_email: string | null }[]
  }

  return (
    <EmailClient
      currentUser={currentUser}
      templates={templates}
      athletes={athletes}
      staffMembers={staffMembers}
    />
  )
}
