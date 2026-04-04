import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  internalDate: string
  payload: {
    headers: { name: string; value: string }[]
    body?: { data?: string }
    parts?: { mimeType: string; body?: { data?: string } }[]
  }
  labelIds: string[]
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

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return decodeURIComponent(escape(atob(base64)))
  } catch {
    return atob(base64)
  }
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase())
  return header?.value || ''
}

function getEmailBody(payload: GmailMessage['payload']): string {
  // Try to get body from parts first (multipart email)
  if (payload.parts) {
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain')
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data)
    }
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html')
    if (htmlPart?.body?.data) {
      // Strip HTML tags for plain text display
      const html = decodeBase64Url(htmlPart.body.data)
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    }
  }

  // Try direct body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }

  return ''
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const maxResults = searchParams.get('maxResults') || '20'
  const pageToken = searchParams.get('pageToken') || ''
  const query = searchParams.get('q') || ''

  // Get user's Gmail tokens
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
      return NextResponse.json({ error: 'Failed to refresh Gmail token' }, { status: 401 })
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

  try {
    // Build query - inbox emails only
    let gmailQuery = 'in:inbox'
    if (query) {
      gmailQuery += ` ${query}`
    }

    // Fetch message list
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
    listUrl.searchParams.set('maxResults', maxResults)
    listUrl.searchParams.set('q', gmailQuery)
    if (pageToken) {
      listUrl.searchParams.set('pageToken', pageToken)
    }

    const listResponse = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!listResponse.ok) {
      const error = await listResponse.json()
      console.error('Gmail list error:', error)
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
    }

    const listData = await listResponse.json()
    const messages = listData.messages || []
    const nextPageToken = listData.nextPageToken || null

    // Fetch full message details for each message
    const emailPromises = messages.slice(0, 10).map(async (msg: { id: string }) => {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!msgResponse.ok) return null
      return msgResponse.json()
    })

    const emailResults = await Promise.all(emailPromises)
    const emails = emailResults
      .filter((e): e is GmailMessage => e !== null)
      .map(email => ({
        id: email.id,
        threadId: email.threadId,
        from: getHeader(email.payload.headers, 'From'),
        to: getHeader(email.payload.headers, 'To'),
        subject: getHeader(email.payload.headers, 'Subject'),
        snippet: email.snippet,
        body: getEmailBody(email.payload),
        date: new Date(parseInt(email.internalDate)).toISOString(),
        isUnread: email.labelIds?.includes('UNREAD') || false,
      }))

    return NextResponse.json({
      emails,
      nextPageToken,
      totalEstimate: listData.resultSizeEstimate || emails.length,
    })
  } catch (err) {
    console.error('Error fetching inbox:', err)
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
  }
}
