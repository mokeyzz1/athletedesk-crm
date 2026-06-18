import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  GmailAttachment,
  MAX_EMAIL_ATTACHMENTS,
  MAX_EMAIL_ATTACHMENT_BYTES,
  validateAttachmentLimits,
} from '@/lib/gmail/send'
import type { Json } from '@/lib/database.types'

const EMAIL_ATTACHMENTS_BUCKET = 'email-attachments'

const scheduledEmailSchema = z.object({
  to: z.string().email('Invalid recipient email').max(254),
  subject: z.string().min(1, 'Subject is required').max(998, 'Subject too long'),
  body: z.string().min(1, 'Body is required').max(100000, 'Email body too long'),
  scheduledFor: z.string().datetime('Invalid scheduled time'),
  athleteId: z.string().uuid().nullable().optional(),
  recipientName: z.string().max(200).optional(),
})

interface CurrentCrmUser {
  id: string
  organization_id: string
  is_admin: boolean
  is_super_admin: boolean
}

interface StoredAttachment {
  filename: string
  mimeType: string
  size: number
  storagePath: string
}

async function getCurrentCrmUser(requestSupabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await requestSupabase.auth.getUser()
  if (!user) return null

  const serviceClient = createServiceClient() as any
  const { data } = await serviceClient
    .from('users')
    .select('id, organization_id, is_admin, is_super_admin')
    .eq('auth_user_id', user.id)
    .single()

  return data as CurrentCrmUser | null
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160) || 'attachment'
}

async function readFormFiles(formData: FormData): Promise<Array<{ file: File; attachment: GmailAttachment }>> {
  const files = formData.getAll('attachments').filter((value): value is File => value instanceof File && value.size > 0)

  if (files.length > MAX_EMAIL_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_EMAIL_ATTACHMENTS} files`)
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > MAX_EMAIL_ATTACHMENT_BYTES) {
    throw new Error('Attachments must be 20 MB or less total')
  }

  const attachments = await Promise.all(files.map(async (file) => ({
    file,
    attachment: {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      content: Buffer.from(await file.arrayBuffer()),
    },
  })))

  const limitError = validateAttachmentLimits(attachments.map(item => item.attachment))
  if (limitError) {
    throw new Error(limitError)
  }

  return attachments
}

async function parseRequest(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    return {
      payload: {
        to: String(formData.get('to') || ''),
        subject: String(formData.get('subject') || ''),
        body: String(formData.get('body') || ''),
        scheduledFor: String(formData.get('scheduledFor') || ''),
        athleteId: formData.get('athleteId') ? String(formData.get('athleteId')) : null,
        recipientName: formData.get('recipientName') ? String(formData.get('recipientName')) : undefined,
      },
      files: await readFormFiles(formData),
    }
  }

  return {
    payload: await request.json(),
    files: [] as Array<{ file: File; attachment: GmailAttachment }>,
  }
}

export async function GET() {
  const supabase = await createClient()
  const currentUser = await getCurrentCrmUser(supabase)

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient() as any
  const { data, error } = await serviceClient
    .from('scheduled_emails')
    .select('*')
    .eq('organization_id', currentUser.organization_id)
    .order('scheduled_for', { ascending: true })
    .limit(100)

  if (error) {
    console.error('Failed to fetch scheduled emails:', error)
    return NextResponse.json({ error: 'Failed to fetch scheduled emails' }, { status: 500 })
  }

  return NextResponse.json({ scheduledEmails: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const currentUser = await getCurrentCrmUser(supabase)

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient() as any

  try {
    const { payload, files } = await parseRequest(request)
    const parsed = scheduledEmailSchema.safeParse(payload)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json({ error: firstError?.message || 'Invalid input' }, { status: 400 })
    }

    const scheduledFor = new Date(parsed.data.scheduledFor)
    if (scheduledFor <= new Date()) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 })
    }

    const { data: scheduledEmail, error: insertError } = await serviceClient
      .from('scheduled_emails')
      .insert({
        organization_id: currentUser.organization_id,
        created_by: currentUser.id,
        athlete_id: parsed.data.athleteId || null,
        to_email: parsed.data.to,
        recipient_name: parsed.data.recipientName || null,
        subject: parsed.data.subject,
        body: parsed.data.body,
        scheduled_for: scheduledFor.toISOString(),
        attachments: [],
      })
      .select('*')
      .single()

    if (insertError || !scheduledEmail) {
      console.error('Failed to schedule email:', insertError)
      return NextResponse.json({ error: 'Failed to schedule email' }, { status: 500 })
    }

    const storedAttachments: StoredAttachment[] = []

    for (const { file, attachment } of files) {
      const storagePath = `${currentUser.organization_id}/${scheduledEmail.id}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`
      const { error: uploadError } = await serviceClient.storage
        .from(EMAIL_ATTACHMENTS_BUCKET)
        .upload(storagePath, attachment.content, {
          contentType: attachment.mimeType,
          upsert: false,
        })

      if (uploadError) {
        if (storedAttachments.length > 0) {
          await serviceClient.storage
            .from(EMAIL_ATTACHMENTS_BUCKET)
            .remove(storedAttachments.map(item => item.storagePath))
        }
        await serviceClient.from('scheduled_emails').delete().eq('id', scheduledEmail.id)
        console.error('Failed to upload scheduled email attachment:', uploadError)
        return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 })
      }

      storedAttachments.push({
        filename: file.name,
        mimeType: attachment.mimeType,
        size: file.size,
        storagePath,
      })
    }

    if (storedAttachments.length > 0) {
      const { error: updateError } = await serviceClient
        .from('scheduled_emails')
        .update({ attachments: storedAttachments as unknown as Json })
        .eq('id', scheduledEmail.id)

      if (updateError) {
        console.error('Failed to attach metadata to scheduled email:', updateError)
        return NextResponse.json({ error: 'Failed to save attachment metadata' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, scheduledEmailId: scheduledEmail.id })
  } catch (err) {
    console.error('Error scheduling email:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to schedule email' },
      { status: 500 }
    )
  }
}
