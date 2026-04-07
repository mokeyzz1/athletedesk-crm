import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is super admin
  const { data: userData } = await supabase
    .from('users')
    .select('id, is_super_admin')
    .eq('google_sso_id', user.id)
    .single() as { data: { id: string; is_super_admin: boolean } | null }

  if (!userData?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ isSuperAdmin: true, userId: userData.id })
}
