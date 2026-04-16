'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { User, UserRole } from '@/lib/database.types'
import { getAuthContext } from './auth'
import { AuthError } from './errors'
import type { ActionResult } from './athletes'

async function requireAdminContext() {
  const context = await getAuthContext()

  if (context.role !== 'admin') {
    throw new AuthError('Only admins can manage team members')
  }

  return context
}

export async function updateUserRole(
  targetUserId: string,
  role: UserRole
): Promise<ActionResult<User>> {
  try {
    const { organizationId, userId } = await requireAdminContext()

    if (targetUserId === userId && role !== 'admin') {
      return { success: false, error: 'You cannot remove your own admin role' }
    }

    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient
      .from('users')
      .update({ role } as never)
      .eq('id', targetUserId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Update user role error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as User }
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
): Promise<ActionResult<User>> {
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
      .select()
      .single()

    if (error) {
      console.error('Update user regions error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as User }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Update user regions unexpected error:', err)
    return { success: false, error: 'Failed to update user regions' }
  }
}
