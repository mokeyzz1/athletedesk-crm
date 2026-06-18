import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { GmailAttachment, GmailSender, sendGmailEmail } from '@/lib/gmail/send'

const EMAIL_ATTACHMENTS_BUCKET = 'email-attachments'
const BATCH_SIZE = 10

interface StoredAttachment {
  filename: string
  mimeType: string
  size: number
  storagePath: string
}

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get('authorization')
  const cronHeader = request.headers.get('x-cron-secret')

  return authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret
}

async function loadAttachments(paths: StoredAttachment[]): Promise<GmailAttachment[]> {
  const serviceClient = createServiceClient() as any
  const attachments: GmailAttachment[] = []

  for (const attachment of paths) {
    const { data, error } = await serviceClient.storage
      .from(EMAIL_ATTACHMENTS_BUCKET)
      .download(attachment.storagePath)

    if (error || !data) {
      throw new Error(`Failed to download attachment ${attachment.filename}`)
    }

    attachments.push({
      filename: attachment.filename,
      mimeType: attachment.mimeType || 'application/octet-stream',
      content: Buffer.from(await data.arrayBuffer()),
    })
  }

  return attachments
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient() as any
  const now = new Date().toISOString()

  const { data: dueEmails, error: dueError } = await serviceClient
    .from('scheduled_emails')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(BATCH_SIZE)

  if (dueError) {
    console.error('Failed to fetch due scheduled emails:', dueError)
    return NextResponse.json({ error: 'Failed to fetch due emails' }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const scheduledEmail of dueEmails || []) {
    const nextAttempt = scheduledEmail.attempts + 1

    const { data: claimed, error: claimError } = await serviceClient
      .from('scheduled_emails')
      .update({
        status: 'sending',
        attempts: nextAttempt,
        last_error: null,
      })
      .eq('id', scheduledEmail.id)
      .eq('status', 'scheduled')
      .select('*')
      .single()

    if (claimError || !claimed) {
      skipped += 1
      continue
    }

    try {
      const { data: senderData } = await serviceClient
        .from('users')
        .select('id, organization_id, gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email, email_signature')
        .eq('id', claimed.created_by)
        .single()

      const sender = senderData as GmailSender | null
      if (!sender) {
        throw new Error('Sender account not found')
      }

      const storedAttachments = Array.isArray(claimed.attachments)
        ? claimed.attachments as unknown as StoredAttachment[]
        : []
      const attachments = await loadAttachments(storedAttachments)

      const { messageId } = await sendGmailEmail({
        supabase: serviceClient,
        sender,
        to: claimed.to_email,
        subject: claimed.subject,
        body: claimed.body,
        athleteId: claimed.athlete_id,
        recipientName: claimed.recipient_name,
        attachments,
      })

      await serviceClient
        .from('scheduled_emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          gmail_message_id: messageId,
          last_error: null,
        })
        .eq('id', claimed.id)

      sent += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send scheduled email'
      console.error('Scheduled email send failed:', { id: claimed.id, error: message })

      await serviceClient
        .from('scheduled_emails')
        .update({
          status: 'failed',
          last_error: message,
        })
        .eq('id', claimed.id)

      failed += 1
    }
  }

  return NextResponse.json({ success: true, sent, failed, skipped })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
