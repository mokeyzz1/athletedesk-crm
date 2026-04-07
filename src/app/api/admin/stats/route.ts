import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is super admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('google_sso_id', user.id)
    .single() as { data: { is_super_admin: boolean } | null }

  if (!userData?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get stats
  const [
    { count: totalOrgs },
    { count: totalUsers },
    { count: totalAthletes },
    { count: pendingInvites },
    { count: usedInvites },
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('athletes').select('*', { count: 'exact', head: true }),
    supabase.from('organization_invites').select('*', { count: 'exact', head: true }).is('accepted_at', null).gt('expires_at', new Date().toISOString()),
    supabase.from('organization_invites').select('*', { count: 'exact', head: true }).not('accepted_at', 'is', null),
  ])

  return NextResponse.json({
    totalOrganizations: totalOrgs || 0,
    totalUsers: totalUsers || 0,
    totalAthletes: totalAthletes || 0,
    pendingInvites: pendingInvites || 0,
    usedInvites: usedInvites || 0,
  })
}
