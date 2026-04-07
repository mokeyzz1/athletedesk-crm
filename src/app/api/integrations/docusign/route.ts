import { NextResponse } from 'next/server'

const DOCUSIGN_CLIENT_ID = process.env.DOCUSIGN_CLIENT_ID!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/docusign/callback`

// GET - Start DocuSign OAuth flow
export async function GET() {
  const scopes = ['signature', 'extended'].join(' ')

  const params = new URLSearchParams({
    response_type: 'code',
    scope: scopes,
    client_id: DOCUSIGN_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
  })

  // Use demo environment for development, production for live
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://account.docusign.com'
    : 'https://account-d.docusign.com'

  const authUrl = `${baseUrl}/oauth/auth?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
