import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/gmail/callback'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // user id
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      console.error('Failed to get access token:', tokens)
      return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
    }

    // Get user's Gmail address
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userInfoResponse.json()

    // Store tokens in database
    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from('users')
      .update({
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        gmail_email: userInfo.email,
      } as never)
      .eq('google_sso_id', state)

    if (updateError) {
      console.error('Failed to store Gmail tokens:', updateError)
      return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
    }

    return NextResponse.redirect(new URL('/settings?gmail=connected', request.url))
  } catch (err) {
    console.error('Gmail OAuth error:', err)
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
  }
}
