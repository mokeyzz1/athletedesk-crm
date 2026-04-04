import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/gmail/callback'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Parse state to get userId and returnUrl
  let userId: string
  let returnUrl = '/settings?gmail=connected'

  try {
    const decoded = JSON.parse(Buffer.from(state || '', 'base64').toString())
    userId = decoded.userId
    returnUrl = decoded.returnUrl || '/settings?gmail=connected'
  } catch {
    // Fallback for old format (just userId string)
    userId = state || ''
  }

  if (error) {
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
  }

  if (!code || !userId) {
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
    console.log('Google userInfo response:', userInfo)

    // Store tokens in database
    const supabase = await createClient()

    // Get current user's email from session to find them in users table
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser?.email) {
      console.error('No authenticated user found')
      return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
    }

    console.log('Saving Gmail tokens for user:', {
      authEmail: authUser.email,
      authId: authUser.id,
      stateUserId: userId,
      gmailEmail: userInfo.email
    })

    // First, check if the user exists in the users table
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, email, google_sso_id')
      .or(`email.eq.${authUser.email},google_sso_id.eq.${authUser.id}`)
      .single() as { data: { id: string; email: string; google_sso_id: string | null } | null; error: { message: string } | null }

    console.log('Found user:', {
      existingUser,
      findError: findError?.message
    })

    if (!existingUser) {
      console.error('User not found in users table:', authUser.email)
      return NextResponse.redirect(new URL('/settings?gmail=error&reason=user_not_found', request.url))
    }

    // Update using the user's id from our users table
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        gmail_email: userInfo.email,
      } as never)
      .eq('id', existingUser.id)
      .select()

    console.log('Gmail token save result:', {
      error: updateError?.message,
      userId: existingUser.id,
      rowsUpdated: updateData?.length || 0,
      gmailEmail: userInfo.email
    })

    if (updateError) {
      console.error('Failed to store Gmail tokens:', updateError)
      return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
    }

    if (!updateData || updateData.length === 0) {
      console.error('No rows updated - RLS might be blocking the update')
      return NextResponse.redirect(new URL('/settings?gmail=error&reason=rls', request.url))
    }

    // Redirect back to where they came from, or settings
    return NextResponse.redirect(new URL(returnUrl, request.url))
  } catch (err) {
    console.error('Gmail OAuth error:', err)
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
  }
}
