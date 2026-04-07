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

  // Get all organizations with user count
  interface OrgRow {
    id: string
    name: string
    slug: string
    logo_url: string | null
    settings: Record<string, unknown>
    created_at: string
    owner: { id: string; name: string; email: string } | null
  }

  const { data: organizations, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      logo_url,
      settings,
      created_at,
      owner:users!organizations_owner_id_fkey(id, name, email)
    `)
    .order('created_at', { ascending: false }) as { data: OrgRow[] | null; error: { message: string } | null }

  if (error) {
    console.error('Failed to fetch organizations:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }

  // Get user counts for each org
  const orgsWithCounts = await Promise.all(
    (organizations || []).map(async (org: OrgRow) => {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)

      const { count: athleteCount } = await supabase
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)

      return {
        ...org,
        userCount: count || 0,
        athleteCount: athleteCount || 0,
      }
    })
  )

  return NextResponse.json({ organizations: orgsWithCounts })
}
