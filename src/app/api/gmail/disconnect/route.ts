import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find user first
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .or(`email.eq.${user.email},google_sso_id.eq.${user.id}`)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Clear Gmail tokens
  const { error } = await supabase
    .from('users')
    .update({
      gmail_access_token: null,
      gmail_refresh_token: null,
      gmail_token_expiry: null,
      gmail_email: null,
    })
    .eq('id', userData.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
