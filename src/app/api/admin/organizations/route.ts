import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client to bypass RLS for all admin queries
  const serviceClient = createServiceClient()

  // Check if user is super admin (using service client to bypass RLS)
  const { data: userData } = await serviceClient
    .from('users')
    .select('is_super_admin')
    .eq('auth_user_id', user.id)
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
    owner_id: string | null
  }

  const { data: organizations, error } = await serviceClient
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      logo_url,
      settings,
      created_at,
      owner_id
    `)
    .order('created_at', { ascending: false }) as { data: OrgRow[] | null; error: { message: string } | null }

  console.log('Organizations fetch result:', { count: organizations?.length, error })

  if (error) {
    console.error('Failed to fetch organizations:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }

  // Get user counts and owner info for each org
  const orgsWithCounts = await Promise.all(
    (organizations || []).map(async (org: OrgRow) => {
      const { count } = await serviceClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)

      const { count: athleteCount } = await serviceClient
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)

      // Get owner info if owner_id exists
      let owner: { id: string; name: string; email: string } | null = null
      if (org.owner_id) {
        const { data: ownerData } = await serviceClient
          .from('users')
          .select('id, name, email')
          .eq('id', org.owner_id)
          .single() as { data: { id: string; name: string; email: string } | null }
        owner = ownerData
      }

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
        settings: org.settings,
        created_at: org.created_at,
        owner,
        userCount: count || 0,
        athleteCount: athleteCount || 0,
      }
    })
  )

  return NextResponse.json({ organizations: orgsWithCounts })
}
