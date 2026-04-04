import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/gmail/callback'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if already connected with valid refresh token
  const { data: userData } = await supabase
    .from('users')
    .select('gmail_refresh_token, gmail_email')
    .or(`email.eq.${user.email},google_sso_id.eq.${user.id}`)
    .single()

  // If already has refresh token, no need to go through OAuth again
  if (userData?.gmail_refresh_token && userData?.gmail_email) {
    return NextResponse.json({
      already_connected: true,
      email: userData.gmail_email
    })
  }

  // Get return URL from query param (where to redirect after OAuth)
  const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/settings?gmail=connected'

  // Encode both user ID and return URL in state
  const state = Buffer.from(JSON.stringify({ userId: user.id, returnUrl })).toString('base64')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('access_type', 'offline')
  // Need 'consent' to get refresh token on first connection
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', state)

  return NextResponse.json({ url: authUrl.toString() })
}
