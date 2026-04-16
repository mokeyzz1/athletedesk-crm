import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Super admin email - can access /admin panel
const SUPER_ADMIN_EMAIL = 'moseskorom82@gmail.com'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle OAuth errors from Supabase/Google
  if (errorParam) {
    console.error('OAuth error:', errorParam, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || errorParam)}`)
  }

  const supabase = await createClient()

  // Handle email confirmation (token_hash flow)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'email' | 'recovery' | 'invite',
    })

    if (error) {
      console.error('Token verification error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data.user) {
      // Successfully verified - now handle user lookup/creation
      return handleAuthenticatedUser(supabase, data.user, origin, next)
    }
  }

  // Handle OAuth code exchange (Google login or email confirmation)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Code exchange error:', error.message)

      // If PKCE error, check if user is already authenticated (email confirmation case)
      if (error.message.includes('PKCE') || error.message.includes('code verifier')) {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session?.user) {
          return handleAuthenticatedUser(supabase, sessionData.session.user, origin, next)
        }
        // Email was confirmed but session not available here - redirect to login
        return NextResponse.redirect(`${origin}/login?message=Email confirmed! Please sign in.`)
      }

      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data.user) {
      return handleAuthenticatedUser(supabase, data.user, origin, next)
    }
  }

  // No code or token_hash - check if user is already authenticated (email/password sign-in)
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session?.user) {
    return handleAuthenticatedUser(supabase, sessionData.session.user, origin, next)
  }

  return NextResponse.redirect(`${origin}/login?error=No authorization code received`)
}

async function handleAuthenticatedUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; email_confirmed_at?: string | null; app_metadata?: { provider?: string }; user_metadata?: { full_name?: string; avatar_url?: string } },
  origin: string,
  next: string
) {
  const authUserId = user.id
  const userEmail = user.email
  const isEmailConfirmed = user.email_confirmed_at != null
  const isGoogleProvider = user.app_metadata?.provider === 'google'

  // STEP 1: Try exact match by auth_user_id (primary lookup)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, organization_id, is_super_admin, auth_user_id, google_sso_id')
    .eq('auth_user_id', authUserId)
    .single() as { data: { id: string; organization_id: string | null; is_super_admin: boolean; auth_user_id: string | null; google_sso_id: string | null } | null }

  if (existingUser) {
    // Found by auth_user_id - update avatar and proceed
    await supabase
      .from('users')
      .update({
        avatar_url: user.user_metadata?.avatar_url,
        // If Google login and google_sso_id not set, link it
        ...(isGoogleProvider && !existingUser.google_sso_id && { google_sso_id: authUserId })
      } as never)
      .eq('auth_user_id', authUserId)

    if (existingUser.is_super_admin) {
      return NextResponse.redirect(`${origin}/admin`)
    }
    return NextResponse.redirect(`${origin}${next}`)
  }

  // STEP 2: Fallback - try match by confirmed email (identity linking)
  // Only do this if email is present and confirmed to prevent hijacking
  if (userEmail && isEmailConfirmed) {
    const { data: emailUser } = await supabase
      .from('users')
      .select('id, organization_id, is_super_admin, auth_user_id, google_sso_id')
      .eq('email', userEmail)
      .single() as { data: { id: string; organization_id: string | null; is_super_admin: boolean; auth_user_id: string | null; google_sso_id: string | null } | null }

    if (emailUser) {
      // Found by email - LINK this auth identity to existing CRM user
      await supabase
        .from('users')
        .update({
          auth_user_id: authUserId,  // Link new auth ID
          avatar_url: user.user_metadata?.avatar_url,
          // If Google login, also store google_sso_id
          ...(isGoogleProvider && { google_sso_id: authUserId })
        } as never)
        .eq('id', emailUser.id)

      if (emailUser.is_super_admin) {
        return NextResponse.redirect(`${origin}/admin`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // STEP 3: No existing user found - this is a new user

  // Check if super admin (special case - no invite needed)
  const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL

  if (isSuperAdmin) {
    // Create super admin user without org - they can access /admin
    const { error: insertError } = await supabase.from('users').insert({
      name: user.user_metadata?.full_name || userEmail?.split('@')[0] || 'Super Admin',
      email: userEmail!,
      auth_user_id: authUserId,
      google_sso_id: isGoogleProvider ? authUserId : null,
      avatar_url: user.user_metadata?.avatar_url,
      role: 'admin',
      roles: ['admin'],
      primary_role: 'admin',
      is_super_admin: true,
      organization_id: null,
    } as never)

    if (insertError) {
      console.error('Failed to create super admin:', insertError)
      return NextResponse.redirect(`${origin}/login?error=Failed to create account`)
    }

    return NextResponse.redirect(`${origin}/admin`)
  }

  // Regular user - must have invite
  const cookieStore = await cookies()
  const inviteToken = cookieStore.get('invite_token')?.value

  if (!inviteToken) {
    // No invite token - redirect to invite-only page
    return NextResponse.redirect(`${origin}/invite-only`)
  }

  // Validate invite token
  interface InviteResult {
    invite_id: string
    invite_email: string | null
    invite_type: 'new_org' | 'join_org'
    organization_id: string | null
    organization_name: string | null
  }
  const { data: inviteData } = await supabase
    .rpc('validate_invite_token' as never, { invite_token: inviteToken } as never) as { data: InviteResult[] | null }

  if (!inviteData || inviteData.length === 0) {
    // Invalid or expired invite
    const response = NextResponse.redirect(`${origin}/invite-only?error=invalid_invite`)
    response.cookies.delete('invite_token')
    return response
  }

  const invite = inviteData[0]

  // Check if email restriction matches (if set)
  if (invite.invite_email && invite.invite_email !== userEmail) {
    const response = NextResponse.redirect(`${origin}/invite-only?error=email_mismatch`)
    response.cookies.delete('invite_token')
    return response
  }

  // Store user info in session and redirect to onboarding
  // We'll create the actual user record after onboarding is complete
  const response = NextResponse.redirect(`${origin}/onboarding`)

  // Store pending user data in a cookie for the onboarding flow
  response.cookies.set('pending_user', JSON.stringify({
    name: user.user_metadata?.full_name || userEmail?.split('@')[0] || 'Unknown',
    email: userEmail!,
    auth_user_id: authUserId,
    google_sso_id: isGoogleProvider ? authUserId : null,
    avatar_url: user.user_metadata?.avatar_url,
    invite_id: invite.invite_id,
    invite_type: invite.invite_type,
    organization_id: invite.organization_id,
    organization_name: invite.organization_name,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 30, // 30 minutes to complete onboarding
  })

  return response
}
