import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/database.types'
import { isAdminLike } from '@/lib/roles'

const ALLOWED_ROLES: UserRole[] = ['admin', 'agent', 'scout', 'marketing', 'intern']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = body.role as UserRole

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: currentUser } = await serviceClient
    .from('users')
    .select('id, organization_id, role, roles')
    .eq('auth_user_id', user.id)
    .single() as { data: { id: string; organization_id: string | null; role: UserRole; roles: UserRole[] | null } | null }

  if (!currentUser?.organization_id) {
    return NextResponse.json({ error: 'User is not associated with an organization' }, { status: 400 })
  }

  if (!isAdminLike(currentUser)) {
    return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 })
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invite, error } = await serviceClient
    .from('organization_invites')
    .insert({
      email,
      invite_type: 'join_org',
      organization_id: currentUser.organization_id,
      created_by: currentUser.id,
      expires_at: expiresAt.toISOString(),
      metadata: { invited_role: role },
    } as never)
    .select('id, token')
    .single()

  if (error || !invite) {
    console.error('Failed to create team invite:', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const inviteUrl = `${appUrl}/invite/${(invite as { token: string }).token}`

  return NextResponse.json({ invite, inviteUrl })
}
