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
  email_signature: string | null
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

function stripHtmlWrapper(html: string): string {
  // Remove DOCTYPE, html, head, and body tags but keep the body content
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')  // Remove head with any attributes
    .replace(/<\/?body[^>]*>/gi, '')
    .replace(/<\/?meta[^>]*>/gi, '')  // Remove meta tags
    .replace(/<\/?title[^>]*>[\s\S]*?<\/title>/gi, '')  // Remove title tags
    .trim()
}

function createRawEmail(to: string, from: string, subject: string, body: string, isHtml: boolean = false): string {
  const contentType = isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8'
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`

  // For HTML emails, wrap in proper document structure
  const emailBody = isHtml
    ? `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333;">
${body}
</body>
</html>`
    : body

  const email = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${contentType}`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(emailBody, 'utf8').toString('base64'),
  ].join('\r\n')

  return Buffer.from(email).toString('base64url')
}

function appendSignature(body: string, signature: string | null): { body: string; isHtml: boolean } {
  if (!signature) {
    return { body, isHtml: false }
  }

  // If signature contains HTML tags, format as HTML email
  const hasHtmlSignature = /<[a-z][\s\S]*>/i.test(signature)

  if (hasHtmlSignature) {
    // Strip any document wrapper from signature (WiseStamp might include it)
    const cleanSignature = stripHtmlWrapper(signature)

    // Convert plain text body to HTML-safe and combine with HTML signature
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    return {
      body: `<div>${htmlBody}</div><br><br><div>${cleanSignature}</div>`,
      isHtml: true,
    }
  } else {
    // Plain text signature
    return {
      body: `${body}\n\n--\n${signature}`,
      isHtml: false,
    }
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's Gmail tokens and email signature
  const { data: userDataRaw } = await supabase
    .from('users')
    .select('id, gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email, email_signature')
    .eq('auth_user_id', user.id)
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
    // Append email signature if set
    const { body: emailWithSignature, isHtml } = appendSignature(emailBody, userData.email_signature)

    // Create raw email
    const rawEmail = createRawEmail(to, userData.gmail_email, subject, emailWithSignature, isHtml)

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
