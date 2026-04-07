import { NextResponse } from 'next/server'

const CALENDLY_CLIENT_ID = process.env.CALENDLY_CLIENT_ID!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/calendly/callback`

// GET - Start Calendly OAuth flow
export async function GET() {
  const params = new URLSearchParams({
    client_id: CALENDLY_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
  })

  const authUrl = `https://auth.calendly.com/oauth/authorize?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
