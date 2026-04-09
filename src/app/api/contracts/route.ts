import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as docusign from '@/lib/integrations/docusign'
import { hasIntegration } from '@/lib/integrations/token-refresh'

// GET - List contracts for an athlete
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const athleteId = searchParams.get('athleteId')

  if (!athleteId) {
    return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })
  }

  // Fetch contracts for the athlete
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('sent_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contracts: contracts || [] })
}

// POST - Send a new contract
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current user's ID
  const { data: userDataRaw } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()

  const userData = userDataRaw as { id: string; organization_id: string | null } | null

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Check if user has DocuSign integration
  const hasDocuSign = await hasIntegration(userData.id, 'docusign')
  if (!hasDocuSign) {
    return NextResponse.json({ error: 'DocuSign not connected' }, { status: 400 })
  }

  const body = await request.json()
  const { athleteId, templateId, recipientEmail, recipientName, title, emailSubject, emailBlurb } = body

  if (!athleteId || !templateId || !recipientEmail || !recipientName || !title) {
    return NextResponse.json(
      { error: 'athleteId, templateId, recipientEmail, recipientName, and title are required' },
      { status: 400 }
    )
  }

  // Send envelope via DocuSign
  const { envelope, error: dsError } = await docusign.sendEnvelopeFromTemplate(
    userData.id,
    {
      templateId,
      recipient: {
        email: recipientEmail,
        name: recipientName,
      },
      emailSubject,
      emailBlurb,
    }
  )

  if (dsError || !envelope) {
    return NextResponse.json({ error: dsError || 'Failed to send contract' }, { status: 500 })
  }

  // Store contract in database
  const { data: contract, error: dbError } = await supabase
    .from('contracts')
    .insert({
      organization_id: userData.organization_id,
      athlete_id: athleteId,
      sent_by_user_id: userData.id,
      envelope_id: envelope.envelopeId,
      title,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      status: 'sent',
      sent_at: new Date().toISOString(),
    } as never)
    .select()
    .single()

  if (dbError) {
    console.error('Failed to store contract:', dbError)
    // Still return success since DocuSign succeeded
  }

  return NextResponse.json({
    contract: contract || { envelope_id: envelope.envelopeId, status: 'sent' },
    envelope,
  })
}
