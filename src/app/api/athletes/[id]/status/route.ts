import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OutreachStatus } from '@/lib/database.types'
import { notifyAthleteAssignments } from '@/lib/actions/athletes'
import { logActivityEvents, type LogActivityEventInput } from '@/lib/actions/activity'

interface StatusUpdateRequest {
  status: OutreachStatus
  school_state?: string | null
  roster_team_id?: string | null
}

interface RegionAssignment {
  default_agent_id: string | null
  default_marketing_id: string | null
}

interface User {
  id: string
  name: string
  notify_new_assignments: boolean
}

interface AthleteData {
  id: string
  name: string
  region: string | null
  outreach_status: OutreachStatus
  assigned_agent_id: string | null
  assigned_marketing_lead_id: string | null
  handoff_to_agent_at: string | null
  handoff_to_marketing_at: string | null
}

// Statuses that trigger handoff to agent
const AGENT_TRIGGER_STATUSES: OutreachStatus[] = ['interested', 'in_conversation']
// Status that triggers handoff to marketing
const MARKETING_TRIGGER_STATUS: OutreachStatus = 'signed'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: athleteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current user
  const { data: currentUserData } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!currentUserData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const currentUser = currentUserData as unknown as { id: string; name: string; role: string }

  const body: StatusUpdateRequest = await request.json()
  const { status: newStatus, school_state, roster_team_id } = body

  if (!newStatus) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 })
  }

  // Get the athlete's current data
  const { data: athleteData, error: athleteError } = await supabase
    .from('athletes')
    .select('id, name, region, outreach_status, assigned_agent_id, assigned_marketing_lead_id, handoff_to_agent_at, handoff_to_marketing_at')
    .eq('id', athleteId)
    .single()

  if (athleteError || !athleteData) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
  }

  const athlete = athleteData as unknown as AthleteData

  const oldStatus = athlete.outreach_status
  const updates: Record<string, unknown> = {
    outreach_status: newStatus,
    updated_at: new Date().toISOString(),
  }

  // Update last_contacted_date when moving from not_contacted
  if (newStatus !== 'not_contacted' && oldStatus === 'not_contacted') {
    updates.last_contacted_date = new Date().toISOString().split('T')[0]
  }

  // For signed status, include school_state and roster_team_id
  if (newStatus === 'signed') {
    updates.recruiting_status = 'signed'
    if (school_state !== undefined) updates.school_state = school_state
    if (roster_team_id !== undefined) updates.roster_team_id = roster_team_id
  }

  const handoffActions: { type: 'agent' | 'marketing'; assignedUser: User | null }[] = []

  // Check for Scout → Agent handoff
  if (
    AGENT_TRIGGER_STATUSES.includes(newStatus) &&
    !AGENT_TRIGGER_STATUSES.includes(oldStatus) &&
    !athlete.assigned_agent_id &&
    !athlete.handoff_to_agent_at &&
    athlete.region
  ) {
    // Look up default agent for this region
    const { data: regionAssignment } = await supabase
      .from('region_assignments')
      .select('default_agent_id, default_marketing_id')
      .eq('region', athlete.region)
      .single() as { data: RegionAssignment | null }

    if (regionAssignment?.default_agent_id) {
      // Get agent details
      const { data: agent } = await supabase
        .from('users')
        .select('id, name, notify_new_assignments')
        .eq('id', regionAssignment.default_agent_id)
        .single() as { data: User | null }

      if (agent) {
        updates.assigned_agent_id = agent.id
        updates.handoff_to_agent_at = new Date().toISOString()
        handoffActions.push({ type: 'agent', assignedUser: agent })
      }
    }
  }

  // Check for Agent → Marketing handoff
  if (
    newStatus === MARKETING_TRIGGER_STATUS &&
    oldStatus !== MARKETING_TRIGGER_STATUS &&
    !athlete.assigned_marketing_lead_id &&
    !athlete.handoff_to_marketing_at &&
    athlete.region
  ) {
    // Look up default marketing lead for this region
    const { data: regionAssignment } = await supabase
      .from('region_assignments')
      .select('default_agent_id, default_marketing_id')
      .eq('region', athlete.region)
      .single() as { data: RegionAssignment | null }

    if (regionAssignment?.default_marketing_id) {
      // Get marketing lead details
      const { data: marketingLead } = await supabase
        .from('users')
        .select('id, name, notify_new_assignments')
        .eq('id', regionAssignment.default_marketing_id)
        .single() as { data: User | null }

      if (marketingLead) {
        updates.assigned_marketing_lead_id = marketingLead.id
        updates.handoff_to_marketing_at = new Date().toISOString()
        handoffActions.push({ type: 'marketing', assignedUser: marketingLead })
      }
    }
  }

  // Update the athlete
  const { error: updateError } = await supabase
    .from('athletes')
    .update(updates as never)
    .eq('id', athleteId)

  if (updateError) {
    console.error('Error updating athlete:', updateError)
    return NextResponse.json({ error: 'Failed to update athlete' }, { status: 500 })
  }

  const activityEvents: LogActivityEventInput[] = []

  // Create tasks for handoffs
  for (const handoff of handoffActions) {
    if (!handoff.assignedUser) continue

    const taskTitle = handoff.type === 'agent'
      ? `Follow up with ${athlete.name} - newly ${newStatus}`
      : `Begin marketing for ${athlete.name} - newly signed`

    const taskDescription = handoff.type === 'agent'
      ? `${athlete.name} has been marked as "${newStatus}" and automatically assigned to you. Please follow up to continue the recruiting process.`
      : `${athlete.name} has been signed and automatically assigned to you for marketing. Please begin marketing outreach and brand partnerships.`

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3) // Due in 3 days

    const { data: task } = await supabase
      .from('tasks')
      .insert({
        title: taskTitle,
        description: taskDescription,
        assigned_to: handoff.assignedUser.id,
        created_by: currentUser.id,
        athlete_id: athleteId,
        due_date: dueDate.toISOString().split('T')[0],
        priority: 'high',
        status: 'todo',
      } as never)
      .select('id')
      .single()

    activityEvents.push({
      entityType: 'athlete',
      entityId: athleteId,
      eventType: 'task.created',
      title: `Task created: ${taskTitle}`,
      metadata: {
        task_id: (task as { id: string } | null)?.id,
        assigned_to: handoff.assignedUser.id,
        priority: 'high',
        status: 'todo',
        source: 'automatic_handoff',
      },
    })
  }

  await notifyAthleteAssignments({
    athleteId,
    athleteName: athlete.name,
    assignments: handoffActions
      .filter((handoff) => handoff.assignedUser)
      .map((handoff) => ({
        userId: handoff.assignedUser!.id,
        role: handoff.type,
      })),
  })

  if (oldStatus !== newStatus) {
    activityEvents.push({
      entityType: 'athlete',
      entityId: athleteId,
      eventType: 'athlete.status_changed',
      title: `${athlete.name} status changed to ${newStatus.replace(/_/g, ' ')}`,
      metadata: {
        previous_status: oldStatus,
        new_status: newStatus,
        source: 'status_route',
      },
    })
  }

  handoffActions.forEach((handoff) => {
    if (!handoff.assignedUser) return

    activityEvents.push({
      entityType: 'athlete',
      entityId: athleteId,
      eventType: 'athlete.handoff',
      title: `${athlete.name} handed off to ${handoff.type === 'agent' ? 'Agent' : 'Marketing Lead'}`,
      metadata: {
        role: handoff.type,
        assigned_user_id: handoff.assignedUser.id,
        new_status: newStatus,
        source: 'automatic_handoff',
      },
    })
  })

  await logActivityEvents(activityEvents)

  return NextResponse.json({
    success: true,
    athlete: {
      id: athleteId,
      outreach_status: newStatus,
    },
    handoffs: handoffActions.map(h => ({
      type: h.type,
      assignedTo: h.assignedUser?.name,
      taskCreated: true,
    })),
  })
}
