import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client to bypass RLS for admin operations
  const serviceClient = createServiceClient()

  // Check if user is super admin
  const { data: userData } = await serviceClient
    .from('users')
    .select('id, is_super_admin')
    .eq('auth_user_id', user.id)
    .single() as { data: { id: string; is_super_admin: boolean } | null }

  if (!userData?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if invite exists and is not already used
  const { data: invite } = await serviceClient
    .from('organization_invites')
    .select('id, accepted_at')
    .eq('id', id)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Cannot delete a used invite' }, { status: 400 })
  }

  // Delete the invite
  const { error } = await serviceClient
    .from('organization_invites')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete invite:', error)
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
