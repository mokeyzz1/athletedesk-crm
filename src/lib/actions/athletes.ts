'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from './auth'
import { AuthError } from './errors'
import type { Athlete, AthleteInsert } from '@/lib/database.types'

// ============================================================================
// Types
// ============================================================================

export interface CreateAthleteInput {
  name: string
  email?: string | null
  phone?: string | null
  school?: string | null
  sport: string
  position?: string | null
  class_year?: string
  region?: string | null
}

export interface UpdateAthleteInput {
  name?: string
  email?: string | null
  phone?: string | null
  school?: string | null
  sport?: string
  position?: string | null
  league_level?: string
  eligibility_year?: number | null
  recruiting_status?: string
  transfer_portal_status?: string
  marketability_score?: number | null
  assigned_scout_id?: string | null
  assigned_agent_id?: string | null
  assigned_marketing_lead_id?: string | null
  scout_ids?: string[]
  agent_ids?: string[]
  marketing_ids?: string[]
  notes?: string | null
  sport_specific_stats?: Record<string, unknown> | null
  social_media?: Record<string, unknown> | null
  class_year?: string
  region?: string | null
  outreach_status?: string
  school_state?: string | null
  roster_team_id?: string | null
  // Roster profile fields
  birthday?: string | null
  hometown?: string | null
  mailing_address?: string | null
  interests?: string | null
  dream_partnership?: string | null
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

type AssignmentRole = 'scout' | 'agent' | 'marketing'

interface AthleteAssignmentNotification {
  userId: string | null | undefined
  role: AssignmentRole
}

const ASSIGNMENT_ROLE_LABELS: Record<AssignmentRole, string> = {
  scout: 'Scout',
  agent: 'Agent',
  marketing: 'Marketing Lead',
}

// ============================================================================
// Validation
// ============================================================================

function validateCreateAthlete(data: CreateAthleteInput): string | null {
  if (!data.name || data.name.trim().length === 0) {
    return 'Name is required'
  }
  if (data.name.length > 200) {
    return 'Name is too long'
  }
  if (!data.sport || data.sport.trim().length === 0) {
    return 'Sport is required'
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return 'Invalid email format'
  }
  return null
}

function validateUpdateAthlete(data: UpdateAthleteInput): string | null {
  if (data.name !== undefined && data.name.trim().length === 0) {
    return 'Name cannot be empty'
  }
  if (data.name && data.name.length > 200) {
    return 'Name is too long'
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return 'Invalid email format'
  }
  if (data.marketability_score !== undefined && data.marketability_score !== null) {
    if (data.marketability_score < 0 || data.marketability_score > 100) {
      return 'Marketability score must be between 0 and 100'
    }
  }
  return null
}

async function insertNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  notifications: Array<Record<string, string | null>>
) {
  if (notifications.length === 0) return

  const { error } = await supabase.from('notifications').insert(notifications as never[])
  if (error) {
    console.error('Create assignment notifications error:', error)
  }
}

function uniqueAssignments(assignments: AthleteAssignmentNotification[]) {
  const seen = new Set<string>()

  return assignments.filter((assignment) => {
    if (!assignment.userId) return false

    const key = `${assignment.userId}:${assignment.role}`
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

/**
 * Notify staff when they are assigned to an athlete.
 * This is intentionally non-blocking for callers; notification failures are logged.
 */
export async function notifyAthleteAssignments(input: {
  athleteId: string
  athleteName: string
  assignments: AthleteAssignmentNotification[]
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { organizationId, userId: actorId } = await getAuthContext()
    const supabase = await createClient()

    const notifications = uniqueAssignments(input.assignments)
      .filter((assignment) => assignment.userId !== actorId)
      .map((assignment) => ({
        organization_id: organizationId,
        user_id: assignment.userId as string,
        type: 'assignment',
        title: `You were assigned to ${input.athleteName}`,
        message: `You have been assigned as ${ASSIGNMENT_ROLE_LABELS[assignment.role]} for this athlete.`,
        href: `/athletes/${input.athleteId}`,
        actor_id: actorId,
        entity_type: 'athlete',
        entity_id: input.athleteId,
      }))

    await insertNotifications(supabase, notifications)
    return { success: true }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Notify athlete assignments unexpected error:', err)
    return { success: false, error: 'Failed to create assignment notifications' }
  }
}

async function notifyAdminsOfAthleteClaim(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  actorId: string,
  athleteId: string,
  athleteName: string,
  assignmentRole: AssignmentRole
) {
  const { data: actor } = await supabase
    .from('users')
    .select('name')
    .eq('id', actorId)
    .maybeSingle() as unknown as { data: { name: string | null } | null }

  const { data: users } = await supabase
    .from('users')
    .select('id, role, roles, is_super_admin')
    .eq('organization_id', organizationId) as unknown as {
      data: Array<{
        id: string
        role: string | null
        roles: string[] | null
        is_super_admin: boolean | null
      }> | null
    }

  const actorName = actor?.name || 'A team member'
  const adminIds = (users || [])
    .filter((user) => (
      user.id !== actorId
      && (user.role === 'admin' || user.roles?.includes('admin') || user.is_super_admin)
    ))
    .map((user) => user.id)

  const notifications = Array.from(new Set(adminIds)).map((adminId) => ({
    organization_id: organizationId,
    user_id: adminId,
    type: 'assignment',
    title: `${actorName} claimed ${athleteName}`,
    message: `${actorName} assigned themself as ${ASSIGNMENT_ROLE_LABELS[assignmentRole]}.`,
    href: `/athletes/${athleteId}`,
    actor_id: actorId,
    entity_type: 'athlete',
    entity_id: athleteId,
  }))

  await insertNotifications(supabase, notifications)
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Create a new athlete
 * - Validates input
 * - Injects organization_id from auth context
 * - Returns created athlete
 */
export async function createAthlete(
  input: CreateAthleteInput
): Promise<ActionResult<Athlete>> {
  try {
    const { organizationId, userId } = await getAuthContext()

    // Validate
    const validationError = validateCreateAthlete(input)
    if (validationError) {
      return { success: false, error: validationError }
    }

    // Build insert data with guaranteed org_id
    const insertData: AthleteInsert = {
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      school: input.school?.trim() || null,
      sport: input.sport.trim(),
      position: input.position?.trim() || null,
      class_year: (input.class_year as AthleteInsert['class_year']) || '2026',
      region: input.region || null,
      organization_id: organizationId, // <-- Always set from auth
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('athletes')
      .insert(insertData as never)
      .select()
      .single()

    if (error) {
      console.error('Create athlete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Athlete }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Create athlete unexpected error:', err)
    return { success: false, error: 'Failed to create athlete' }
  }
}

/**
 * Update an existing athlete
 * - Validates input
 * - Ensures user can only update athletes in their org (via RLS)
 * - Strips organization_id from update payload
 * - Creates notifications for new assignments
 */
export async function updateAthlete(
  athleteId: string,
  input: UpdateAthleteInput
): Promise<ActionResult<Athlete>> {
  try {
    const { organizationId, userId } = await getAuthContext()

    // Validate
    const validationError = validateUpdateAthlete(input)
    if (validationError) {
      return { success: false, error: validationError }
    }

    // Strip organization_id if someone tries to pass it
    const { ...safeInput } = input as UpdateAthleteInput & { organization_id?: string }
    delete (safeInput as { organization_id?: string }).organization_id

    const supabase = await createClient()

    // Fetch current athlete to compare assignments
    const { data: currentAthlete } = await supabase
      .from('athletes')
      .select('name, assigned_scout_id, assigned_agent_id, assigned_marketing_lead_id, scout_ids, agent_ids, marketing_ids')
      .eq('id', athleteId)
      .eq('organization_id', organizationId)
      .maybeSingle() as { data: {
        name: string
        assigned_scout_id: string | null
        assigned_agent_id: string | null
        assigned_marketing_lead_id: string | null
        scout_ids: string[] | null
        agent_ids: string[] | null
        marketing_ids: string[] | null
      } | null }

    // Clean up the data
    const updateData: Record<string, unknown> = {}

    if (safeInput.name !== undefined) updateData.name = safeInput.name.trim()
    if (safeInput.email !== undefined) updateData.email = safeInput.email?.trim() || null
    if (safeInput.phone !== undefined) updateData.phone = safeInput.phone?.trim() || null
    if (safeInput.school !== undefined) updateData.school = safeInput.school?.trim() || null
    if (safeInput.sport !== undefined) updateData.sport = safeInput.sport.trim()
    if (safeInput.position !== undefined) updateData.position = safeInput.position?.trim() || null
    if (safeInput.league_level !== undefined) updateData.league_level = safeInput.league_level
    if (safeInput.eligibility_year !== undefined) updateData.eligibility_year = safeInput.eligibility_year
    if (safeInput.recruiting_status !== undefined) updateData.recruiting_status = safeInput.recruiting_status
    if (safeInput.transfer_portal_status !== undefined) updateData.transfer_portal_status = safeInput.transfer_portal_status
    if (safeInput.marketability_score !== undefined) updateData.marketability_score = safeInput.marketability_score
    if (safeInput.assigned_scout_id !== undefined) updateData.assigned_scout_id = safeInput.assigned_scout_id
    if (safeInput.assigned_agent_id !== undefined) updateData.assigned_agent_id = safeInput.assigned_agent_id
    if (safeInput.assigned_marketing_lead_id !== undefined) updateData.assigned_marketing_lead_id = safeInput.assigned_marketing_lead_id
    if (safeInput.scout_ids !== undefined) updateData.scout_ids = safeInput.scout_ids
    if (safeInput.agent_ids !== undefined) updateData.agent_ids = safeInput.agent_ids
    if (safeInput.marketing_ids !== undefined) updateData.marketing_ids = safeInput.marketing_ids
    if (safeInput.notes !== undefined) updateData.notes = safeInput.notes
    if (safeInput.sport_specific_stats !== undefined) updateData.sport_specific_stats = safeInput.sport_specific_stats
    if (safeInput.social_media !== undefined) updateData.social_media = safeInput.social_media
    if (safeInput.class_year !== undefined) updateData.class_year = safeInput.class_year
    if (safeInput.region !== undefined) updateData.region = safeInput.region
    if (safeInput.outreach_status !== undefined) updateData.outreach_status = safeInput.outreach_status
    if (safeInput.school_state !== undefined) updateData.school_state = safeInput.school_state
    if (safeInput.roster_team_id !== undefined) updateData.roster_team_id = safeInput.roster_team_id
    // Roster profile fields
    if (safeInput.birthday !== undefined) updateData.birthday = safeInput.birthday
    if (safeInput.hometown !== undefined) updateData.hometown = safeInput.hometown?.trim() || null
    if (safeInput.mailing_address !== undefined) updateData.mailing_address = safeInput.mailing_address?.trim() || null
    if (safeInput.interests !== undefined) updateData.interests = safeInput.interests?.trim() || null
    if (safeInput.dream_partnership !== undefined) updateData.dream_partnership = safeInput.dream_partnership?.trim() || null

    // Update with org check (RLS enforces this, but explicit is safer)
    const { data, error } = await supabase
      .from('athletes')
      .update(updateData as never)
      .eq('id', athleteId)
      .eq('organization_id', organizationId) // Extra safety
      .select()
      .maybeSingle()

    if (error) {
      console.error('Update athlete error:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Athlete not found or you do not have permission to edit them' }
    }

    // Create notifications for new assignments
    if (currentAthlete && data) {
      const athleteName = (data as Athlete).name
      const notifications: Array<{
        organization_id: string
        user_id: string
        type: string
        title: string
        message: string
        href: string
        actor_id: string
        entity_type: string
        entity_id: string
      }> = []

      // Check primary assignments
      const checkAssignment = (
        oldId: string | null,
        newId: string | null | undefined,
        role: string
      ) => {
        if (newId && newId !== oldId && newId !== userId) {
          notifications.push({
            organization_id: organizationId,
            user_id: newId,
            type: 'assignment',
            title: `You were assigned to ${athleteName}`,
            message: `You have been assigned as ${role} for this athlete.`,
            href: `/athletes/${athleteId}`,
            actor_id: userId,
            entity_type: 'athlete',
            entity_id: athleteId,
          })
        }
      }

      // Check array assignments for new members
      const checkArrayAssignment = (
        oldIds: string[] | null,
        newIds: string[] | null | undefined,
        role: string
      ) => {
        if (!newIds) return
        const oldSet = new Set(oldIds || [])
        newIds.forEach((id) => {
          if (!oldSet.has(id) && id !== userId) {
            notifications.push({
              organization_id: organizationId,
              user_id: id,
              type: 'assignment',
              title: `You were assigned to ${athleteName}`,
              message: `You have been added as ${role} for this athlete.`,
              href: `/athletes/${athleteId}`,
              actor_id: userId,
              entity_type: 'athlete',
              entity_id: athleteId,
            })
          }
        })
      }

      checkAssignment(currentAthlete.assigned_scout_id, safeInput.assigned_scout_id, 'Scout')
      checkAssignment(currentAthlete.assigned_agent_id, safeInput.assigned_agent_id, 'Agent')
      checkAssignment(currentAthlete.assigned_marketing_lead_id, safeInput.assigned_marketing_lead_id, 'Marketing Lead')
      checkArrayAssignment(currentAthlete.scout_ids, safeInput.scout_ids, 'Scout')
      checkArrayAssignment(currentAthlete.agent_ids, safeInput.agent_ids, 'Agent')
      checkArrayAssignment(currentAthlete.marketing_ids, safeInput.marketing_ids, 'Marketing')

      await insertNotifications(supabase, notifications)
    }

    return { success: true, data: data as Athlete }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Update athlete unexpected error:', err)
    return { success: false, error: 'Failed to update athlete' }
  }
}

/**
 * Let staff assign themselves to the matching athlete role.
 * - Scouts can only assign themselves as scout
 * - Agents can only assign themselves as agent
 * - Marketing can only assign themselves as marketing lead
 * - Existing assignments cannot be overwritten here; admins can reassign in edit flows
 */
export async function selfAssignAthlete(
  athleteId: string,
  assignmentRole?: 'scout' | 'agent' | 'marketing'
): Promise<ActionResult<Athlete>> {
  try {
    const { organizationId, userId, role, roles } = await getAuthContext()
    const targetRole = assignmentRole || (role as 'scout' | 'agent' | 'marketing')

    if (
      !['scout', 'agent', 'marketing'].includes(targetRole)
      || (!roles.includes('admin') && !roles.includes(targetRole))
    ) {
      return { success: false, error: 'Your role cannot self-assign athletes' }
    }

    const supabase = await createClient()
    const callSelfAssign = supabase.rpc.bind(supabase) as unknown as (
      fn: 'self_assign_athlete',
      args: { p_athlete_id: string; p_assignment_role: 'scout' | 'agent' | 'marketing' }
    ) => Promise<{ data: Athlete | null; error: { message: string } | null }>

    const { data, error } = await callSelfAssign('self_assign_athlete', {
      p_athlete_id: athleteId,
      p_assignment_role: targetRole,
    })

    if (error) {
      console.error('Self-assign athlete RPC error:', error)
      return { success: false, error: error.message || 'RPC failed' }
    }

    if (!data) {
      console.error('Self-assign athlete returned null data, no error')
      return { success: false, error: 'No data returned from assignment' }
    }

    try {
      await notifyAdminsOfAthleteClaim(
        supabase,
        organizationId,
        userId,
        athleteId,
        (data as Athlete).name || 'this athlete',
        targetRole
      )
    } catch (notificationError) {
      console.error('Self-assign notification error:', notificationError)
    }

    return { success: true, data: data as Athlete }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Self-assign athlete unexpected error:', err)
    return { success: false, error: 'Failed to assign athlete' }
  }
}

/**
 * Delete an athlete
 * - Ensures user can only delete athletes in their org
 */
export async function deleteAthlete(
  athleteId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { organizationId } = await getAuthContext()

    const supabase = await createClient()

    const { error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', athleteId)
      .eq('organization_id', organizationId) // Extra safety

    if (error) {
      console.error('Delete athlete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: { id: athleteId } }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Delete athlete unexpected error:', err)
    return { success: false, error: 'Failed to delete athlete' }
  }
}

/**
 * Get a single athlete by ID
 * - RLS ensures user can only see athletes in their org
 */
export async function getAthlete(
  athleteId: string
): Promise<ActionResult<Athlete>> {
  try {
    await getAuthContext() // Verify auth

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Athlete }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    return { success: false, error: 'Failed to fetch athlete' }
  }
}

/**
 * Bulk delete athletes
 * - Deletes multiple athletes in batches to avoid query limits
 * - Ensures user can only delete athletes in their org
 */
export async function bulkDeleteAthletes(
  athleteIds: string[]
): Promise<ActionResult<{ deleted: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    if (athleteIds.length === 0) {
      return { success: false, error: 'No athletes selected' }
    }

    const supabase = await createClient()
    const BATCH_SIZE = 100
    let totalDeleted = 0

    // Process in batches to avoid query size limits
    for (let i = 0; i < athleteIds.length; i += BATCH_SIZE) {
      const batch = athleteIds.slice(i, i + BATCH_SIZE)

      const { error, count } = await supabase
        .from('athletes')
        .delete({ count: 'exact' })
        .in('id', batch)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Bulk delete athletes error:', error)
        return {
          success: false,
          error: `Failed after deleting ${totalDeleted} athletes: ${error.message}`
        }
      }

      totalDeleted += count || 0
    }

    return { success: true, data: { deleted: totalDeleted } }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Bulk delete athletes unexpected error:', err)
    return { success: false, error: 'Failed to delete athletes' }
  }
}

/**
 * Bulk import athletes
 * - Validates each record
 * - Injects organization_id on all records
 */
export async function bulkCreateAthletes(
  athletes: CreateAthleteInput[]
): Promise<ActionResult<{ created: number; failed: number; errors: string[] }>> {
  try {
    const { organizationId } = await getAuthContext()

    const errors: string[] = []
    const validAthletes: AthleteInsert[] = []

    // Validate each athlete
    athletes.forEach((athlete, index) => {
      const error = validateCreateAthlete(athlete)
      if (error) {
        errors.push(`Row ${index + 1}: ${error}`)
      } else {
        validAthletes.push({
          name: athlete.name.trim(),
          email: athlete.email?.trim() || null,
          phone: athlete.phone?.trim() || null,
          school: athlete.school?.trim() || null,
          sport: athlete.sport.trim(),
          position: athlete.position?.trim() || null,
          class_year: (athlete.class_year as AthleteInsert['class_year']) || '2026',
          region: athlete.region || null,
          organization_id: organizationId, // <-- Always set
        })
      }
    })

    if (validAthletes.length === 0) {
      return {
        success: true,
        data: { created: 0, failed: athletes.length, errors },
      }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('athletes')
      .insert(validAthletes as never[])
      .select('id')

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: {
        created: data?.length || 0,
        failed: athletes.length - (data?.length || 0),
        errors,
      },
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    return { success: false, error: 'Failed to import athletes' }
  }
}
