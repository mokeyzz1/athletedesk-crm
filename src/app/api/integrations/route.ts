import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { IntegrationProvider } from '@/lib/database.types'

// GET - List all integrations for current user
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

  // Get all integrations for this user
  const { data: integrations, error } = await supabase
    .from('user_integrations')
    .select('id, provider, account_email, account_name, is_active, created_at')
    .eq('user_id', userData.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ integrations: integrations || [] })
}

// DELETE - Disconnect an integration
export async function DELETE(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { provider } = await request.json() as { provider: IntegrationProvider }

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

  // Delete the integration
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', userData.id)
    .eq('provider', provider)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
