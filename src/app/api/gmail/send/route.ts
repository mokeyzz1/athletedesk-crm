import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  GmailAttachment,
  GmailSender,
  MAX_EMAIL_ATTACHMENTS,
  MAX_EMAIL_ATTACHMENT_BYTES,
  sendGmailEmail,
  validateAttachmentLimits,
} from '@/lib/gmail/send'

const sendEmailSchema = z.object({
  to: z.string().email('Invalid recipient email').max(254),
  subject: z.string().min(1, 'Subject is required').max(998, 'Subject too long'),
  body: z.string().min(1, 'Body is required').max(100000, 'Email body too long'),
  athleteId: z.string().uuid().nullable().optional(),
  recipientName: z.string().max(200).optional(),
})

async function readFormAttachments(formData: FormData): Promise<GmailAttachment[]> {
  const files = formData.getAll('attachments').filter((value): value is File => value instanceof File)

  if (files.length > MAX_EMAIL_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_EMAIL_ATTACHMENTS} files`)
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > MAX_EMAIL_ATTACHMENT_BYTES) {
    throw new Error('Attachments must be 20 MB or less total')
  }

  const attachments: GmailAttachment[] = []
  for (const file of files) {
    if (file.size === 0) continue

    attachments.push({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      content: Buffer.from(await file.arrayBuffer()),
    })
  }

  const limitError = validateAttachmentLimits(attachments)
  if (limitError) {
    throw new Error(limitError)
  }

  return attachments
}

async function parseRequest(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const payload = {
      to: String(formData.get('to') || ''),
      subject: String(formData.get('subject') || ''),
      body: String(formData.get('body') || ''),
      athleteId: formData.get('athleteId') ? String(formData.get('athleteId')) : null,
      recipientName: formData.get('recipientName') ? String(formData.get('recipientName')) : undefined,
    }

    return {
      payload,
      attachments: await readFormAttachments(formData),
    }
  }

  return {
    payload: await request.json(),
    attachments: [] as GmailAttachment[],
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userDataRaw } = await supabase
    .from('users')
    .select('id, organization_id, gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email, email_signature')
    .eq('auth_user_id', user.id)
    .single()

  const userData = userDataRaw as GmailSender | null

  if (!userData?.gmail_access_token || !userData?.gmail_refresh_token) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 })
  }

  try {
    const { payload, attachments } = await parseRequest(request)
    const parsed = sendEmailSchema.safeParse(payload)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json({ error: firstError?.message || 'Invalid input' }, { status: 400 })
    }

    const { to, subject, body, athleteId, recipientName } = parsed.data
    await sendGmailEmail({
      supabase,
      sender: userData,
      to,
      subject,
      body,
      athleteId,
      recipientName,
      attachments,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error sending email:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
