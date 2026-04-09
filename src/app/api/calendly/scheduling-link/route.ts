import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getSchedulingLink } from '@/lib/integrations/calendly'

// GET - Get Calendly scheduling link
export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current user's ID
  const { data: userDataRaw } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const userData = userDataRaw as { id: string } | null

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get scheduling link from Calendly
  const url = await getSchedulingLink(userData.id)

  if (!url) {
    return NextResponse.json({ error: 'Could not get scheduling link' }, { status: 400 })
  }

  return NextResponse.json({ url })
}
