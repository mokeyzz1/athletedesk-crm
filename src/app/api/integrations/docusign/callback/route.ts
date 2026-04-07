import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DOCUSIGN_CLIENT_ID = process.env.DOCUSIGN_CLIENT_ID!
const DOCUSIGN_CLIENT_SECRET = process.env.DOCUSIGN_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/docusign/callback`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=docusign&error=${error}`)
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=docusign&error=no_code`)
  }

  try {
    // Use demo environment for development, production for live
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://account.docusign.com'
      : 'https://account-d.docusign.com'

    // Exchange code for tokens
    const basicAuth = Buffer.from(`${DOCUSIGN_CLIENT_ID}:${DOCUSIGN_CLIENT_SECRET}`).toString('base64')
    const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    })

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=docusign&error=${tokens.error}`)
    }

    // Get user info from DocuSign
    const userInfoResponse = await fetch(`${baseUrl}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = await userInfoResponse.json()

    // Get current user from Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=docusign&error=not_authenticated`)
    }

    // Get user ID
    const { data: userDataRaw } = await supabase
      .from('users')
      .select('id')
      .eq('google_sso_id', user.id)
      .single()

    const userData = userDataRaw as { id: string } | null

    if (!userData) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=docusign&error=user_not_found`)
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Get the default account
    const defaultAccount = userInfo.accounts?.find((a: { is_default: boolean }) => a.is_default) || userInfo.accounts?.[0]

    // Upsert the integration
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userData.id,
        provider: 'docusign',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        account_email: userInfo.email,
        account_name: userInfo.name,
        settings: {
          account_id: defaultAccount?.account_id,
          base_uri: defaultAccount?.base_uri,
        },
        is_active: true,
      } as never, {
        onConflict: 'user_id,provider',
      })

    if (upsertError) {
      console.error('Error saving integration:', upsertError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=docusign&error=save_failed`)
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=docusign&success=true`)
  } catch (err) {
    console.error('DocuSign OAuth error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?integration=docusign&error=unknown`)
  }
}
