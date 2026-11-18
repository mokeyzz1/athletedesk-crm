import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmailClient } from './email-client'
import type { User } from '@/lib/database.types'
import { isAdminLike } from '@/lib/roles'

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
    .eq('auth_user_id', user.id)
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

  if (!isAdminLike(currentUser)) {
    athletesQuery = athletesQuery.or(
      `assigned_scout_id.eq.${currentUser.id},assigned_agent_id.eq.${currentUser.id},assigned_marketing_lead_id.eq.${currentUser.id}`
    )
  }

  const { data: athletesData } = await athletesQuery
  const athletes = athletesData || []

  // For admin, get all staff members
  let staffMembers: { id: string; name: string; gmail_email: string | null }[] = []
  if (isAdminLike(currentUser)) {
    const { data: staffData } = await supabase
      .from('users')
      .select('id, name, gmail_email')
      .not('gmail_email', 'is', null)
      .order('name')

    staffMembers = (staffData || []) as { id: string; name: string; gmail_email: string | null }[]
  }

  // Emails this user sent from AthleteDesk (we don't read Gmail itself)
  const { data: sentData } = await supabase
    .from('communications_log')
    .select('id, subject, notes, communication_date, recipient_email, recipient_name, athletes(name, email)')
    .eq('staff_member_id', currentUser.id)
    .eq('type', 'email')
    .like('notes', 'Sent via AthleteDesk%')
    .order('communication_date', { ascending: false })
    .limit(100)

  type SentRow = {
    id: string
    subject: string | null
    notes: string | null
    communication_date: string
    recipient_email: string | null
    recipient_name: string | null
    athletes: { name: string; email: string | null } | null
  }
  const sentEmails = ((sentData || []) as unknown as SentRow[]).map(row => ({
    id: row.id,
    to: row.athletes?.name ?? row.recipient_name ?? row.recipient_email ?? 'Unknown',
    toEmail: row.athletes?.email ?? row.recipient_email ?? null,
    subject: row.subject ?? '',
    body: (row.notes ?? '').replace(/^Sent via AthleteDesk Gmail integration\.\n\n/, ''),
    date: row.communication_date,
  }))

  return (
    <EmailClient
      currentUser={currentUser}
      templates={templates}
      athletes={athletes}
      staffMembers={staffMembers}
      sentEmails={sentEmails}
    />
  )
}
