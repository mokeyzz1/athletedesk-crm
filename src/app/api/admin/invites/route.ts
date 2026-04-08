import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail, generateInviteEmail } from '@/lib/gmail'

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
    .select('id, is_super_admin')
    .eq('google_sso_id', user.id)
    .single() as { data: { id: string; is_super_admin: boolean } | null }

  if (!userData?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all invites
  const { data: invites, error } = await serviceClient
    .from('organization_invites')
    .select(`
      id,
      token,
      email,
      invite_type,
      expires_at,
      accepted_at,
      created_at,
      organization:organizations(id, name),
      created_by_user:users!organization_invites_created_by_fkey(id, name),
      accepted_by_user:users!organization_invites_accepted_by_fkey(id, name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Failed to fetch invites:', error)
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }

  return NextResponse.json({ invites })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  if (!user || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client to bypass RLS for admin operations
  const serviceClient = createServiceClient()

  // Check if user is super admin (using service client to bypass RLS)
  const { data: userData } = await serviceClient
    .from('users')
    .select('id, is_super_admin')
    .eq('google_sso_id', user.id)
    .single() as { data: { id: string; is_super_admin: boolean } | null }

  if (!userData?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, inviteType, organizationId, expiresInDays = 7, sendEmailInvite = true } = body

  if (!inviteType || !['new_org', 'join_org'].includes(inviteType)) {
    return NextResponse.json({ error: 'Invalid invite type' }, { status: 400 })
  }

  if (inviteType === 'join_org' && !organizationId) {
    return NextResponse.json({ error: 'Organization ID required for join_org invites' }, { status: 400 })
  }

  // Get organization name if joining
  let organizationName: string | undefined
  if (inviteType === 'join_org' && organizationId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single() as { data: { name: string } | null }
    organizationName = org?.name
  }

  // Create invite
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const { data: invite, error } = await supabase
    .from('organization_invites')
    .insert({
      email: email || null,
      invite_type: inviteType,
      organization_id: inviteType === 'join_org' ? organizationId : null,
      created_by: userData.id,
      expires_at: expiresAt.toISOString(),
    } as never)
    .select('id, token')
    .single()

  if (error || !invite) {
    console.error('Failed to create invite:', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${(invite as { token: string }).token}`

  // Send email if email provided and sendEmailInvite is true
  let emailSent = false
  let emailError: string | undefined

  if (email && sendEmailInvite && session.provider_token) {
    const { subject, body: emailBody } = generateInviteEmail({
      inviteUrl,
      inviteType,
      organizationName,
      expiresInDays,
    })

    const result = await sendEmail(session.provider_token, {
      to: email,
      subject,
      body: emailBody,
      html: true,
    })

    emailSent = result.success
    emailError = result.error
  }

  return NextResponse.json({
    invite,
    inviteUrl,
    emailSent,
    emailError,
  })
}
