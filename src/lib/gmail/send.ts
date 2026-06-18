const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

export const MAX_EMAIL_ATTACHMENTS = 10
export const MAX_EMAIL_ATTACHMENT_BYTES = 20 * 1024 * 1024

export interface GmailAttachment {
  filename: string
  mimeType: string
  content: Buffer
}

export interface GmailSender {
  id: string
  organization_id: string | null
  gmail_access_token: string | null
  gmail_refresh_token: string | null
  gmail_token_expiry: string | null
  gmail_email: string | null
  email_signature: string | null
}

interface SendGmailEmailParams {
  supabase: any
  sender: GmailSender
  to: string
  subject: string
  body: string
  athleteId?: string | null
  recipientName?: string | null
  attachments?: GmailAttachment[]
  logCommunication?: boolean
}

function stripHtmlWrapper(html: string): string {
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .replace(/<\/?meta[^>]*>/gi, '')
    .replace(/<\/?title[^>]*>[\s\S]*?<\/title>/gi, '')
    .trim()
}

function appendSignature(body: string, signature: string | null): { body: string; isHtml: boolean } {
  if (!signature) {
    return { body, isHtml: false }
  }

  const hasHtmlSignature = /<[a-z][\s\S]*>/i.test(signature)

  if (hasHtmlSignature) {
    const cleanSignature = stripHtmlWrapper(signature)
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    return {
      body: `<div>${htmlBody}</div><br><br><div>${cleanSignature}</div>`,
      isHtml: true,
    }
  }

  return {
    body: `${body}\n\n--\n${signature}`,
    isHtml: false,
  }
}

function encodeHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function wrapBase64(value: string): string {
  return value.replace(/.{1,76}/g, '$&\r\n').trimEnd()
}

function quoteHeaderParam(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function createEmailBody(body: string, isHtml: boolean): string {
  if (!isHtml) {
    return body
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333;">
${body}
</body>
</html>`
}

function createRawEmail(params: {
  to: string
  from: string
  subject: string
  body: string
  isHtml: boolean
  attachments: GmailAttachment[]
}): string {
  const { to, from, subject, body, isHtml, attachments } = params
  const contentType = isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8'
  const encodedSubject = encodeHeader(subject)
  const emailBody = createEmailBody(body, isHtml)

  if (attachments.length === 0) {
    const email = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: ${contentType}`,
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(Buffer.from(emailBody, 'utf8').toString('base64')),
    ].join('\r\n')

    return Buffer.from(email).toString('base64url')
  }

  const boundary = `athletedesk_${Date.now()}_${Math.random().toString(16).slice(2)}`
  const parts = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: ${contentType}`,
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(emailBody, 'utf8').toString('base64')),
  ]

  for (const attachment of attachments) {
    const encodedFilename = encodeHeader(attachment.filename)
    const fallbackFilename = quoteHeaderParam(attachment.filename.replace(/[^\x20-\x7E]/g, '_'))

    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType || 'application/octet-stream'}; name="${encodedFilename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      `X-Attachment-Id: ${fallbackFilename}`,
      '',
      wrapBase64(attachment.content.toString('base64'))
    )
  }

  parts.push(`--${boundary}--`)

  return Buffer.from(parts.join('\r\n')).toString('base64url')
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

export function validateAttachmentLimits(attachments: GmailAttachment[]): string | null {
  if (attachments.length > MAX_EMAIL_ATTACHMENTS) {
    return `You can attach up to ${MAX_EMAIL_ATTACHMENTS} files`
  }

  const totalSize = attachments.reduce((sum, attachment) => sum + attachment.content.byteLength, 0)
  if (totalSize > MAX_EMAIL_ATTACHMENT_BYTES) {
    return 'Attachments must be 20 MB or less total'
  }

  return null
}

export async function sendGmailEmail({
  supabase,
  sender,
  to,
  subject,
  body,
  athleteId,
  recipientName,
  attachments = [],
  logCommunication = true,
}: SendGmailEmailParams): Promise<{ messageId: string }> {
  if (!sender.gmail_access_token || !sender.gmail_refresh_token) {
    throw new Error('Gmail not connected')
  }

  if (!sender.gmail_email) {
    throw new Error('Gmail email not found')
  }

  const attachmentError = validateAttachmentLimits(attachments)
  if (attachmentError) {
    throw new Error(attachmentError)
  }

  let accessToken = sender.gmail_access_token

  if (sender.gmail_token_expiry && new Date(sender.gmail_token_expiry) <= new Date()) {
    const newTokens = await refreshAccessToken(sender.gmail_refresh_token)
    if (!newTokens) {
      throw new Error('Failed to refresh Gmail token. Please reconnect.')
    }

    accessToken = newTokens.access_token

    await supabase
      .from('users')
      .update({
        gmail_access_token: newTokens.access_token,
        gmail_token_expiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      })
      .eq('id', sender.id)
  }

  const { body: emailWithSignature, isHtml } = appendSignature(body, sender.email_signature)
  const rawEmail = createRawEmail({
    to,
    from: sender.gmail_email,
    subject,
    body: emailWithSignature,
    isHtml,
    attachments,
  })

  const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawEmail }),
  })

  if (!sendResponse.ok) {
    const error = await sendResponse.json().catch(() => null)
    console.error('Gmail send error:', error)
    throw new Error(error?.error?.message || 'Failed to send email')
  }

  const sendData = await sendResponse.json()

  if (logCommunication) {
    await supabase
      .from('communications_log')
      .insert({
        organization_id: sender.organization_id || undefined,
        athlete_id: athleteId || null,
        staff_member_id: sender.id,
        type: 'email',
        subject,
        notes: `Sent via AthleteDesk Gmail integration.${attachments.length > 0 ? `\nAttachments: ${attachments.map(a => a.filename).join(', ')}` : ''}\n\n${body}`,
        communication_date: new Date().toISOString(),
        follow_up_completed: false,
        recipient_email: athleteId ? null : to,
        recipient_name: athleteId ? null : (recipientName || null),
      })
  }

  return { messageId: sendData.id }
}
