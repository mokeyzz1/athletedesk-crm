import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as docusign from '@/lib/integrations/docusign'
import { hasIntegration } from '@/lib/integrations/token-refresh'

// GET - List DocuSign templates
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

  // Check if user has DocuSign integration
  const hasDocuSign = await hasIntegration(userData.id, 'docusign')
  if (!hasDocuSign) {
    return NextResponse.json({ error: 'DocuSign not connected' }, { status: 400 })
  }

  // Fetch templates from DocuSign
  const { templates, error } = await docusign.listTemplates(userData.id)

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ templates })
}
