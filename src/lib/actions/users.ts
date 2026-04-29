'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { User, UserRole, WorkRole } from '@/lib/database.types'
import { getAuthContext } from './auth'
import { AuthError } from './errors'
import type { ActionResult } from './athletes'

type TeamUser = Pick<
  User,
  | 'id'
  | 'organization_id'
  | 'name'
  | 'email'
  | 'role'
  | 'roles'
  | 'primary_role'
  | 'is_admin'
  | 'work_roles'
  | 'primary_work_role'
  | 'avatar_url'
  | 'created_at'
  | 'updated_at'
  | 'assigned_regions'
>

/**
 * Compute clean role model fields from legacy roles array.
 * Returns: { is_admin, work_roles, primary_work_role }
 */
function computeCleanRoleFields(roles: UserRole[], primaryRole: UserRole): {
  is_admin: boolean
  work_roles: WorkRole[]
  primary_work_role: WorkRole | null
} {
  const is_admin = roles.includes('admin')
  const work_roles = roles.filter(r => r !== 'admin') as WorkRole[]

  // Primary work role: use primaryRole if it's not admin, otherwise first work role
  let primary_work_role: WorkRole | null = null
  if (primaryRole !== 'admin') {
    primary_work_role = primaryRole as WorkRole
  } else if (work_roles.length > 0) {
    primary_work_role = work_roles[0]
  }

  return { is_admin, work_roles, primary_work_role }
}

async function requireAdminContext() {
  const context = await getAuthContext()

  if (!context.roles.includes('admin')) {
    throw new AuthError('Only admins can manage team members')
  }

  return context
}

function revalidateTeamAdminPaths() {
  revalidatePath('/settings')
  revalidatePath('/settings/team')
  revalidatePath('/team/productivity')
}

export async function updateUserRole(
  targetUserId: string,
  role: UserRole
): Promise<ActionResult<TeamUser>> {
  try {
    const { organizationId, userId } = await requireAdminContext()

    if (targetUserId === userId && role !== 'admin') {
      return { success: false, error: 'You cannot remove your own admin role' }
    }

    // Compute clean role model fields
    const { is_admin, work_roles, primary_work_role } = computeCleanRoleFields([role], role)

    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient
      .from('users')
      .update({
        // Legacy columns (for RLS compatibility)
        role,
        primary_role: role,
        roles: [role],
        // Clean role model columns
        is_admin,
        work_roles,
        primary_work_role,
      } as never)
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .select('id, organization_id, name, email, role, roles, primary_role, is_admin, work_roles, primary_work_role, avatar_url, created_at, updated_at, assigned_regions')
      .maybeSingle()

    if (error || !data) {
      console.error('Update user role error:', error)
      return { success: false, error: error?.message || 'Team member not found in the current organization' }
    }

    revalidateTeamAdminPaths()

    return { success: true, data: data as TeamUser }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Update user role unexpected error:', err)
    return { success: false, error: 'Failed to update user role' }
  }
}

export async function updateUserRegions(
  targetUserId: string,
  regions: string[]
): Promise<ActionResult<TeamUser>> {
  try {
    const { organizationId } = await requireAdminContext()
    const cleanRegions = Array.from(new Set(regions.map(r => r.trim()).filter(Boolean)))

    const serviceClient = createServiceClient()

    if (cleanRegions.length > 0) {
      const { data: validRegions, error: regionsError } = await serviceClient
        .from('recruiting_regions')
        .select('name')
        .eq('organization_id', organizationId)
        .in('name', cleanRegions)

      if (regionsError) {
        console.error('Validate user regions error:', regionsError)
        return { success: false, error: regionsError.message }
      }

      const validRegionNames = new Set(((validRegions || []) as { name: string }[]).map(r => r.name))
      const invalidRegions = cleanRegions.filter(region => !validRegionNames.has(region))

      if (invalidRegions.length > 0) {
        return { success: false, error: `Invalid region: ${invalidRegions[0]}` }
      }
    }

    const { data, error } = await serviceClient
      .from('users')
      .update({ assigned_regions: cleanRegions } as never)
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .select('id, organization_id, name, email, role, roles, primary_role, is_admin, work_roles, primary_work_role, avatar_url, created_at, updated_at, assigned_regions')
      .maybeSingle()

    if (error || !data) {
      console.error('Update user regions error:', error)
      return { success: false, error: error?.message || 'Team member not found in the current organization' }
    }

    revalidateTeamAdminPaths()

    return { success: true, data: data as TeamUser }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Update user regions unexpected error:', err)
    return { success: false, error: 'Failed to update user regions' }
  }
}

export async function updateUserRoles(
  targetUserId: string,
  roles: UserRole[],
  primaryRole: UserRole
): Promise<ActionResult<TeamUser>> {
  try {
    const { organizationId, userId } = await requireAdminContext()

    // Validate: roles must not be empty
    if (!roles.length) {
      return { success: false, error: 'At least one role is required' }
    }

    // Validate: primaryRole must be in roles
    if (!roles.includes(primaryRole)) {
      return { success: false, error: 'Primary role must be one of the selected roles' }
    }

    // Prevent admin from removing their own admin role
    if (targetUserId === userId && !roles.includes('admin')) {
      return { success: false, error: 'You cannot remove your own admin role' }
    }

    // Compute clean role model fields
    const { is_admin, work_roles, primary_work_role } = computeCleanRoleFields(roles, primaryRole)

    const serviceClient = createServiceClient()

    // Sync both legacy and clean role model columns
    const { data, error } = await serviceClient
      .from('users')
      .update({
        // Legacy columns (for RLS compatibility)
        role: primaryRole,
        primary_role: primaryRole,
        roles: roles,
        // Clean role model columns
        is_admin,
        work_roles,
        primary_work_role,
      } as never)
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .select('id, organization_id, name, email, role, roles, primary_role, is_admin, work_roles, primary_work_role, avatar_url, created_at, updated_at, assigned_regions')
      .maybeSingle()

    if (error || !data) {
      console.error('Update user roles error:', error)
      return { success: false, error: error?.message || 'Team member not found in the current organization' }
    }

    revalidateTeamAdminPaths()

    return { success: true, data: data as TeamUser }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Update user roles unexpected error:', err)
    return { success: false, error: 'Failed to update user roles' }
  }
}
