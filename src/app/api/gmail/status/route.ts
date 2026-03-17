import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UserGmailStatus {
  gmail_email: string | null
  gmail_access_token: string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userDataRaw } = await supabase
    .from('users')
    .select('gmail_email, gmail_access_token')
    .eq('google_sso_id', user.id)
    .single()

  const userData = userDataRaw as UserGmailStatus | null

  const isConnected = !!(userData?.gmail_access_token && userData?.gmail_email)

  return NextResponse.json({
    connected: isConnected,
    email: isConnected ? userData.gmail_email : null,
  })
}
