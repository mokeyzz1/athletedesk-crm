import { createClient, createServiceClient } from '@/lib/supabase/server'
import { accessRequestStatusSchema } from '@/lib/access-requests'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateAccessRequestSchema = z.object({
  id: z.string().uuid(),
  status: accessRequestStatusSchema,
})

async function getSuperAdminServiceClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const serviceClient = createServiceClient()

  const { data: userData } = await serviceClient
    .from('users')
    .select('is_super_admin')
    .eq('auth_user_id', user.id)
    .single() as { data: { is_super_admin: boolean } | null }

  if (!userData?.is_super_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { serviceClient }
}

export async function GET() {
  const auth = await getSuperAdminServiceClient()
  if ('error' in auth) return auth.error

  const { serviceClient } = auth
  const { data, error } = await serviceClient
    .from('access_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('access requests fetch failed:', error)
    return NextResponse.json({ error: 'Failed to load access requests' }, { status: 500 })
  }

  return NextResponse.json({ requests: data ?? [] })
}

export async function PATCH(request: Request) {
  const auth = await getSuperAdminServiceClient()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = updateAccessRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request status' }, { status: 400 })
  }

  const { serviceClient } = auth
  const { data, error } = await serviceClient
    .from('access_requests')
    .update({ status: parsed.data.status } as never)
    .eq('id', parsed.data.id)
    .select('*')
    .single()

  if (error) {
    console.error('access request update failed:', error)
    return NextResponse.json({ error: 'Failed to update access request' }, { status: 500 })
  }

  return NextResponse.json({ request: data })
}
