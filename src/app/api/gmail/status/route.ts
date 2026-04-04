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

  // Look up user by email OR google_sso_id
  const { data: userDataRaw, error } = await supabase
    .from('users')
    .select('id, email, gmail_email, gmail_access_token, google_sso_id')
    .or(`email.eq.${user.email},google_sso_id.eq.${user.id}`)
    .single() as { data: { id: string; email: string; gmail_email: string | null; gmail_access_token: string | null; google_sso_id: string | null } | null; error: { message: string } | null }

  // Debug logging
  console.log('Gmail status check:', {
    authUserEmail: user.email,
    authUserId: user.id,
    foundUserId: userDataRaw?.id,
    foundUserEmail: userDataRaw?.email,
    hasToken: !!userDataRaw?.gmail_access_token,
    hasGmailEmail: !!userDataRaw?.gmail_email,
    gmailEmail: userDataRaw?.gmail_email,
    error: error?.message
  })

  const userData = userDataRaw as UserGmailStatus | null

  const isConnected = !!(userData?.gmail_access_token && userData?.gmail_email)

  return NextResponse.json({
    connected: isConnected,
    email: isConnected ? userData.gmail_email : null,
  })
}
