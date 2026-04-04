import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

interface SendEmailRequest {
  to: string
  subject: string
  body: string
  athleteId: string | null
  recipientName?: string
}

interface UserWithGmail {
  id: string
  gmail_access_token: string | null
  gmail_refresh_token: string | null
  gmail_token_expiry: string | null
  gmail_email: string | null
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const data = await response.json()
    if (data.access_token) {
      return { access_token: data.access_token, expires_in: data.expires_in }
    }
    return null
  } catch {
    return null
  }
}

function createRawEmail(to: string, from: string, subject: string, body: string): string {
  const email = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n')

  return Buffer.from(email).toString('base64url')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's Gmail tokens - look up by email or google_sso_id
  const { data: userDataRaw } = await supabase
    .from('users')
    .select('id, gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email')
    .or(`email.eq.${user.email},google_sso_id.eq.${user.id}`)
    .single()

  const userData = userDataRaw as UserWithGmail | null

  if (!userData?.gmail_access_token || !userData?.gmail_refresh_token) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 })
  }

  let accessToken = userData.gmail_access_token

  // Check if token is expired and refresh if needed
  if (userData.gmail_token_expiry && new Date(userData.gmail_token_expiry) <= new Date()) {
    const newTokens = await refreshAccessToken(userData.gmail_refresh_token)
    if (!newTokens) {
      return NextResponse.json({ error: 'Failed to refresh Gmail token. Please reconnect.' }, { status: 401 })
    }

    accessToken = newTokens.access_token

    // Update stored token
    await supabase
      .from('users')
      .update({
        gmail_access_token: newTokens.access_token,
        gmail_token_expiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      } as never)
      .eq('id', userData.id)
  }

  const body: SendEmailRequest = await request.json()
  const { to, subject, body: emailBody, athleteId, recipientName } = body

  if (!to || !subject || !emailBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!userData.gmail_email) {
    return NextResponse.json({ error: 'Gmail email not found' }, { status: 400 })
  }

  try {
    // Create raw email
    const rawEmail = createRawEmail(to, userData.gmail_email, subject, emailBody)

    // Send via Gmail API
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawEmail }),
    })

    if (!sendResponse.ok) {
      const error = await sendResponse.json()
      console.error('Gmail send error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Always create communication log entry (counts toward email stats)
    await supabase
      .from('communications_log')
      .insert({
        athlete_id: athleteId || null,
        staff_member_id: userData.id,
        type: 'email',
        subject: subject,
        notes: `Sent via AthleteDesk Gmail integration.\n\n${emailBody}`,
        communication_date: new Date().toISOString(),
        follow_up_completed: false,
        recipient_email: athleteId ? null : to,
        recipient_name: athleteId ? null : (recipientName || null),
      } as never)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error sending email:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
