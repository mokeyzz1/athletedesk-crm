import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client to bypass RLS for admin operations
  const serviceClient = createServiceClient()

  // Check if user is super admin (using service client to bypass RLS)
  const { data: userData } = await serviceClient
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
    serviceClient.from('organizations').select('*', { count: 'exact', head: true }),
    serviceClient.from('users').select('*', { count: 'exact', head: true }),
    serviceClient.from('athletes').select('*', { count: 'exact', head: true }),
    serviceClient.from('organization_invites').select('*', { count: 'exact', head: true }).is('accepted_at', null).gt('expires_at', new Date().toISOString()),
    serviceClient.from('organization_invites').select('*', { count: 'exact', head: true }).not('accepted_at', 'is', null),
  ])

  return NextResponse.json({
    totalOrganizations: totalOrgs || 0,
    totalUsers: totalUsers || 0,
    totalAthletes: totalAthletes || 0,
    pendingInvites: pendingInvites || 0,
    usedInvites: usedInvites || 0,
  })
}
