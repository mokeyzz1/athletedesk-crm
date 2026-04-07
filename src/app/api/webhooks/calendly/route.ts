import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Calendly webhook payload types
interface CalendlyWebhookPayload {
  event: 'invitee.created' | 'invitee.canceled'
  payload: {
    event_type: {
      name: string
    }
    event: {
      start_time: string
      end_time: string
      name: string
      location?: {
        join_url?: string
        location?: string
      }
    }
    invitee: {
      email: string
      name: string
    }
    questions_and_answers?: Array<{
      question: string
      answer: string
    }>
    scheduled_event: {
      uri: string
    }
  }
  created_at: string
}

// Create admin Supabase client for webhooks (no auth context)
function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST - Handle Calendly webhook events
export async function POST(request: Request) {
  try {
    // Verify Calendly webhook signature (in production, verify with signing key)
    const signature = request.headers.get('Calendly-Webhook-Signature')

    // Note: In production, you should verify the webhook signature
    // using your Calendly webhook signing key

    const body: CalendlyWebhookPayload = await request.json()

    console.log('Calendly webhook received:', body.event)

    // Only process invitee.created events (new bookings)
    if (body.event !== 'invitee.created') {
      return NextResponse.json({ received: true })
    }

    const { payload } = body
    const inviteeEmail = payload.invitee.email.toLowerCase()
    const inviteeName = payload.invitee.name
    const eventName = payload.event_type.name
    const startTime = payload.event.start_time
    const endTime = payload.event.end_time
    const meetingUrl = payload.event.location?.join_url

    const supabase = getAdminSupabase()

    // Try to find an athlete with this email
    const { data: athleteData } = await supabase
      .from('athletes')
      .select('id, name, organization_id')
      .ilike('email', inviteeEmail)
      .single()

    const athlete = athleteData as { id: string; name: string; organization_id: string | null } | null

    if (!athlete) {
      console.log(`No athlete found with email: ${inviteeEmail}`)
      return NextResponse.json({ received: true, note: 'No matching athlete' })
    }

    // Find a user in the same organization with Calendly connected
    // (to properly attribute the event)
    const { data: integrationData } = await supabase
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'calendly')
      .eq('is_active', true)
      .limit(1)
      .single()

    const integration = integrationData as { user_id: string } | null

    if (!integration) {
      console.log('No Calendly integration found')
      return NextResponse.json({ received: true, note: 'No integration found' })
    }

    // Log the meeting as a calendar event
    await supabase.from('calendar_events').insert({
      organization_id: athlete.organization_id,
      user_id: integration.user_id,
      athlete_id: athlete.id,
      external_id: payload.scheduled_event.uri,
      provider: 'calendly',
      title: `${eventName} with ${inviteeName}`,
      description: `Booked via Calendly`,
      start_time: startTime,
      end_time: endTime,
      meeting_url: meetingUrl,
      status: 'confirmed',
    })

    // Also log as a communication
    await supabase.from('communications_log').insert({
      athlete_id: athlete.id,
      staff_member_id: integration.user_id,
      type: 'meeting',
      subject: `Calendly: ${eventName}`,
      notes: `Meeting scheduled via Calendly\n\nInvitee: ${inviteeName} (${inviteeEmail})\nTime: ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}${meetingUrl ? `\nMeeting URL: ${meetingUrl}` : ''}`,
      communication_date: new Date().toISOString().split('T')[0],
    })

    console.log(`Logged Calendly booking for athlete: ${athlete.name}`)

    return NextResponse.json({ received: true, logged: true })
  } catch (error) {
    console.error('Calendly webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
