import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// DocuSign Connect webhook payload types
interface DocuSignConnectPayload {
  event: string
  apiVersion: string
  uri: string
  retryCount: number
  configurationId: number
  generatedDateTime: string
  data: {
    accountId: string
    userId: string
    envelopeId: string
    envelopeSummary: {
      status: string
      documentsUri: string
      recipientsUri: string
      envelopeId: string
      emailSubject: string
      sentDateTime?: string
      deliveredDateTime?: string
      completedDateTime?: string
      declinedDateTime?: string
      voidedDateTime?: string
      voidedReason?: string
    }
  }
}

// Create admin Supabase client for webhooks (no auth context)
function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Map DocuSign status to our contract status
function mapStatus(dsStatus: string): string {
  const statusMap: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    completed: 'signed',
    signed: 'signed',
    declined: 'declined',
    voided: 'voided',
  }
  return statusMap[dsStatus.toLowerCase()] || dsStatus.toLowerCase()
}

// POST - Handle DocuSign Connect webhooks
export async function POST(request: Request) {
  try {
    // In production, verify the DocuSign Connect signature using HMAC
    // See: https://developers.docusign.com/platform/webhooks/connect/hmac/

    const body: DocuSignConnectPayload = await request.json()

    console.log('DocuSign webhook received:', body.event, body.data?.envelopeId)

    const { data } = body
    if (!data?.envelopeId || !data?.envelopeSummary) {
      return NextResponse.json({ received: true, note: 'No envelope data' })
    }

    const envelopeId = data.envelopeId
    const status = mapStatus(data.envelopeSummary.status)

    const supabase = getAdminSupabase()

    // Find the contract by envelope ID
    const { data: contractData, error: findError } = await supabase
      .from('contracts')
      .select('*')
      .eq('envelope_id', envelopeId)
      .single()

    if (findError || !contractData) {
      console.log(`No contract found for envelope: ${envelopeId}`)
      return NextResponse.json({ received: true, note: 'No matching contract' })
    }

    const contract = contractData as {
      id: string
      athlete_id: string
      title: string
      status: string
      organization_id: string
    }

    // Update contract status
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    // Set signed_at if status is signed
    if (status === 'signed' && data.envelopeSummary.completedDateTime) {
      updateData.signed_at = data.envelopeSummary.completedDateTime
    }

    const { error: updateError } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contract.id)

    if (updateError) {
      console.error('Failed to update contract status:', updateError)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    console.log(`Updated contract ${contract.id} status to: ${status}`)

    if (contract.status !== status) {
      await supabase.from('activity_events').insert({
        organization_id: contract.organization_id,
        actor_id: null,
        entity_type: 'athlete',
        entity_id: contract.athlete_id,
        event_type: 'contract.status_changed',
        title: `Contract status changed: ${contract.title}`,
        metadata: {
          contract_id: contract.id,
          previous_status: contract.status,
          new_status: status,
          envelope_id: envelopeId,
          source: 'docusign_webhook',
        },
      })
    }

    // If signed, create a notification/log entry
    if (status === 'signed') {
      // Log as an activity
      await supabase.from('communications_log').insert({
        athlete_id: contract.athlete_id,
        type: 'note',
        subject: `Contract Signed: ${contract.title}`,
        notes: `The contract "${contract.title}" was signed via DocuSign on ${new Date().toLocaleString()}.`,
        communication_date: new Date().toISOString().split('T')[0],
      })

      console.log(`Logged contract signing for athlete: ${contract.athlete_id}`)
    }

    return NextResponse.json({ received: true, updated: true, status })
  } catch (error) {
    console.error('DocuSign webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
