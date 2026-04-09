import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const APOLLO_CLIENT_ID = process.env.APOLLO_CLIENT_ID!
const APOLLO_CLIENT_SECRET = process.env.APOLLO_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/apollo/callback`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=apollo&error=${error}`)
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=apollo&error=no_code`)
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://app.apollo.io/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: APOLLO_CLIENT_ID,
        client_secret: APOLLO_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    })

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=apollo&error=${tokens.error}`)
    }

    // Get user info from Apollo
    const userInfoResponse = await fetch('https://api.apollo.io/v1/users/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userInfoResponse.json()

    // Get current user from Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=apollo&error=not_authenticated`)
    }

    // Get user ID
    const { data: userDataRaw } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const userData = userDataRaw as { id: string } | null

    if (!userData) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=apollo&error=user_not_found`)
    }

    // Calculate token expiry
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    // Upsert the integration
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userData.id,
        provider: 'apollo',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        account_email: userInfo.email,
        account_name: userInfo.name || userInfo.email,
        is_active: true,
      } as never, {
        onConflict: 'user_id,provider',
      })

    if (upsertError) {
      console.error('Error saving integration:', upsertError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=apollo&error=save_failed`)
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=apollo&success=true`)
  } catch (err) {
    console.error('Apollo OAuth error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=apollo&error=unknown`)
  }
}
