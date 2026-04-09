import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Set which organization the super admin is viewing
export async function POST(request: Request) {
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
    .select('id, is_super_admin')
    .eq('auth_user_id', user.id)
    .single() as { data: { id: string; is_super_admin: boolean } | null }

  if (!userData?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { organizationId } = body

  // Update user's viewing_organization_id in database
  const { error } = await serviceClient
    .from('users')
    .update({ viewing_organization_id: organizationId || null } as never)
    .eq('id', userData.id)

  if (error) {
    console.error('Failed to update viewing_organization_id:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true, organizationId: organizationId || null })
}

// Get current impersonation state
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ organizationId: null })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('viewing_organization_id, is_super_admin')
    .eq('auth_user_id', user.id)
    .single() as { data: { viewing_organization_id: string | null; is_super_admin: boolean } | null }

  return NextResponse.json({
    organizationId: userData?.viewing_organization_id || null,
    isSuperAdmin: userData?.is_super_admin || false
  })
}
