import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Super admin email - can access /admin panel
const SUPER_ADMIN_EMAIL = 'moseskorom82@gmail.com'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle OAuth errors from Supabase/Google
  if (errorParam) {
    console.error('OAuth error:', errorParam, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || errorParam)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=No authorization code received`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Code exchange error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  if (data.user) {
    // Check if user exists in our users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, organization_id, is_super_admin')
      .eq('google_sso_id', data.user.id)
      .single() as { data: { id: string; organization_id: string | null; is_super_admin: boolean } | null }

    // EXISTING USER - redirect appropriately
    if (existingUser) {
      // Update avatar_url on every login to keep it fresh
      await supabase
        .from('users')
        .update({ avatar_url: data.user.user_metadata.avatar_url } as never)
        .eq('google_sso_id', data.user.id)

      // Super admin always goes to admin panel on sign-in
      if (existingUser.is_super_admin) {
        return NextResponse.redirect(`${origin}/admin`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }

    // NEW USER - check for invite token
    const cookieStore = await cookies()
    const inviteToken = cookieStore.get('invite_token')?.value

    // Check if super admin (special case - no invite needed)
    const isSuperAdmin = data.user.email === SUPER_ADMIN_EMAIL

    if (isSuperAdmin) {
      // Create super admin user without org - they can access /admin
      const { error: insertError } = await supabase.from('users').insert({
        name: data.user.user_metadata.full_name || data.user.email?.split('@')[0] || 'Super Admin',
        email: data.user.email!,
        google_sso_id: data.user.id,
        avatar_url: data.user.user_metadata.avatar_url,
        role: 'admin',
        is_super_admin: true,
        organization_id: null, // Super admin doesn't need an org initially
      } as never)

      if (insertError) {
        console.error('Failed to create super admin:', insertError)
        return NextResponse.redirect(`${origin}/login?error=Failed to create account`)
      }

      return NextResponse.redirect(`${origin}/admin`)
    }

    // Regular user - must have invite
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
      // Clear the bad token
      response.cookies.delete('invite_token')
      return response
    }

    const invite = inviteData[0]

    // Check if email restriction matches (if set)
    if (invite.invite_email && invite.invite_email !== data.user.email) {
      const response = NextResponse.redirect(`${origin}/invite-only?error=email_mismatch`)
      response.cookies.delete('invite_token')
      return response
    }

    // Store user info in session and redirect to onboarding
    // We'll create the actual user record after onboarding is complete
    const response = NextResponse.redirect(`${origin}/onboarding`)

    // Store pending user data in a cookie for the onboarding flow
    response.cookies.set('pending_user', JSON.stringify({
      name: data.user.user_metadata.full_name || data.user.email?.split('@')[0] || 'Unknown',
      email: data.user.email!,
      google_sso_id: data.user.id,
      avatar_url: data.user.user_metadata.avatar_url,
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

  // No user data returned
  return NextResponse.redirect(`${origin}/login?error=No user data received`)
}
