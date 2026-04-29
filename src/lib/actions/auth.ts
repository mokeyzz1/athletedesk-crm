'use server'

import { createClient } from '@/lib/supabase/server'
import type { WorkRole } from '@/lib/database.types'
import { AuthError } from './errors'

export type { AuthError }

export interface AuthContext {
  userId: string
  organizationId: string
  role: string       // Primary role (backward compat)
  roles: string[]    // All user roles (legacy)
  email: string
  isSuperAdmin: boolean
  // Clean role model
  isAdmin: boolean
  workRoles: WorkRole[]
  primaryWorkRole: WorkRole | null
}

/**
 * Get the current user's auth context including organization
 * Use this in all server actions to ensure proper scoping
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthError('Not authenticated')
  }

  // Get the user's internal ID and organization
  // Uses auth_user_id as the primary lookup key (provider-neutral)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, organization_id, viewing_organization_id, is_super_admin, role, roles, primary_role, is_admin, work_roles, primary_work_role')
    .eq('auth_user_id', user.id)
    .single() as {
      data: {
        id: string
        organization_id: string | null
        viewing_organization_id: string | null
        is_super_admin: boolean
        role: string
        roles: string[] | null
        primary_role: string | null
        // Clean role model
        is_admin: boolean | null
        work_roles: WorkRole[] | null
        primary_work_role: WorkRole | null
      } | null
      error: unknown
    }

  if (userError || !userData) {
    throw new AuthError('User not found in database')
  }

  const effectiveOrganizationId = userData.is_super_admin && userData.viewing_organization_id
    ? userData.viewing_organization_id
    : userData.organization_id

  if (!effectiveOrganizationId) {
    throw new AuthError('User not associated with an organization')
  }

  // Legacy roles: fallback to role if roles array not yet populated
  const roles = userData.roles?.length ? userData.roles : [userData.role]
  if (userData.is_super_admin && !roles.includes('admin')) {
    roles.push('admin')
  }

  // Clean role model: prefer new columns, fallback to legacy
  const isAdmin = userData.is_admin ?? userData.is_super_admin ?? roles.includes('admin')
  const workRoles: WorkRole[] = userData.work_roles?.length
    ? userData.work_roles
    : (roles.filter(r => r !== 'admin') as WorkRole[])
  const primaryWorkRole: WorkRole | null = userData.primary_work_role
    ?? (userData.primary_role && userData.primary_role !== 'admin' ? userData.primary_role as WorkRole : null)
    ?? workRoles[0]
    ?? null

  return {
    userId: userData.id,
    organizationId: effectiveOrganizationId,
    role: userData.primary_role || userData.role,
    roles,
    email: user.email || '',
    isSuperAdmin: userData.is_super_admin,
    // Clean role model
    isAdmin,
    workRoles,
    primaryWorkRole,
  }
}

/**
 * Check if user has one of the required roles
 * Admin role grants access to everything (superpower pattern)
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthContext> {
  const context = await getAuthContext()

  // Admin has superpower - always allowed
  if (context.roles.includes('admin')) {
    return context
  }

  // Check if any of the user's roles matches the allowed roles
  const hasAllowedRole = context.roles.some(role => allowedRoles.includes(role))
  if (!hasAllowedRole) {
    throw new AuthError(`Requires one of: ${allowedRoles.join(', ')}`)
  }

  return context
}
