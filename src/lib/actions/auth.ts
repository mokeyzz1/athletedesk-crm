'use server'

import { createClient } from '@/lib/supabase/server'
import { AuthError } from './errors'

export type { AuthError }

export interface AuthContext {
  userId: string
  organizationId: string
  role: string       // Primary role (backward compat)
  roles: string[]    // All user roles
  email: string
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
    .select('id, organization_id, role, roles, primary_role')
    .eq('auth_user_id', user.id)
    .single() as { data: { id: string; organization_id: string | null; role: string; roles: string[] | null; primary_role: string | null } | null; error: unknown }

  if (userError || !userData) {
    throw new AuthError('User not found in database')
  }

  if (!userData.organization_id) {
    throw new AuthError('User not associated with an organization')
  }

  // Fallback: use role if roles array not yet populated
  const roles = userData.roles?.length ? userData.roles : [userData.role]

  return {
    userId: userData.id,
    organizationId: userData.organization_id,
    role: userData.primary_role || userData.role,
    roles,
    email: user.email || '',
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

