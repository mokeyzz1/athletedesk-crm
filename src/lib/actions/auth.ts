'use server'

import { createClient } from '@/lib/supabase/server'
import { AuthError } from './errors'

export type { AuthError }

export interface AuthContext {
  userId: string
  organizationId: string
  role: string
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
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, organization_id, role')
    .eq('google_sso_id', user.id)
    .single() as { data: { id: string; organization_id: string | null; role: string } | null; error: unknown }

  if (userError || !userData) {
    throw new AuthError('User not found in database')
  }

  if (!userData.organization_id) {
    throw new AuthError('User not associated with an organization')
  }

  return {
    userId: userData.id,
    organizationId: userData.organization_id,
    role: userData.role,
    email: user.email || '',
  }
}

/**
 * Check if user has one of the required roles
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthContext> {
  const context = await getAuthContext()

  if (!allowedRoles.includes(context.role)) {
    throw new AuthError(`Requires one of: ${allowedRoles.join(', ')}`)
  }

  return context
}
