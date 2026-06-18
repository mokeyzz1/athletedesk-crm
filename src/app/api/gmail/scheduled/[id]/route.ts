import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const EMAIL_ATTACHMENTS_BUCKET = 'email-attachments'

interface CurrentCrmUser {
  id: string
  organization_id: string
  is_admin: boolean
  is_super_admin: boolean
}

interface StoredAttachment {
  storagePath?: string
}

async function getCurrentCrmUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const serviceClient = createServiceClient() as any
  const { data } = await serviceClient
    .from('users')
    .select('id, organization_id, is_admin, is_super_admin')
    .eq('auth_user_id', user.id)
    .single()

  return data as CurrentCrmUser | null
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const currentUser = await getCurrentCrmUser()

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient() as any
  let query = serviceClient
    .from('scheduled_emails')
    .select('*')
    .eq('id', id)
    .eq('organization_id', currentUser.organization_id)
    .eq('status', 'scheduled')

  if (!currentUser.is_admin && !currentUser.is_super_admin) {
    query = query.eq('created_by', currentUser.id)
  }

  const { data: scheduledEmail, error: fetchError } = await query.single()

  if (fetchError || !scheduledEmail) {
    return NextResponse.json({ error: 'Scheduled email not found' }, { status: 404 })
  }

  const attachments = Array.isArray(scheduledEmail.attachments)
    ? scheduledEmail.attachments as StoredAttachment[]
    : []
  const storagePaths = attachments
    .map(attachment => attachment.storagePath)
    .filter((path): path is string => !!path)

  const { error: updateError } = await serviceClient
    .from('scheduled_emails')
    .update({ status: 'cancelled' })
    .eq('id', scheduledEmail.id)
    .eq('status', 'scheduled')

  if (updateError) {
    console.error('Failed to cancel scheduled email:', updateError)
    return NextResponse.json({ error: 'Failed to cancel scheduled email' }, { status: 500 })
  }

  if (storagePaths.length > 0) {
    await serviceClient.storage.from(EMAIL_ATTACHMENTS_BUCKET).remove(storagePaths)
  }

  return NextResponse.json({ success: true })
}
