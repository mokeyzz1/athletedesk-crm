import type { UserRole, WorkRole as DBWorkRole } from '@/lib/database.types'

// Work roles only (admin is a permission, not a work role)
export type WorkRole = DBWorkRole

type RoleLike = {
  role?: UserRole | string | null
  roles?: (UserRole | string)[] | null
  primary_role?: UserRole | string | null
  is_super_admin?: boolean | null
  // New clean role model columns
  is_admin?: boolean | null
  work_roles?: (WorkRole | string)[] | null
  primary_work_role?: WorkRole | string | null
}

// =============================================================================
// LOW-LEVEL HELPERS
// =============================================================================

export function getUserRoles(user: RoleLike | null | undefined): UserRole[] {
  if (!user) return []

  if (user.roles?.length) {
    return user.roles as UserRole[]
  }

  return user.role ? [user.role as UserRole] : []
}

export function getPrimaryRole(user: RoleLike | null | undefined): UserRole | '' {
  if (!user) return ''
  return ((user.primary_role || user.role) as UserRole | undefined) || ''
}

// =============================================================================
// PERMISSION HELPERS (admin = can do anything)
// =============================================================================

/**
 * Check if user has admin-level permissions.
 * True if: is_super_admin OR is_admin OR 'admin' in roles[] (fallback)
 * Use for: permission checks, action guards, admin-only pages
 */
export function isAdminLike(user: RoleLike | null | undefined): boolean {
  if (!user) return false
  if (user.is_super_admin) return true
  if (user.is_admin) return true
  // Fallback to old roles[] for compatibility
  const roles = getUserRoles(user)
  return roles.includes('admin')
}

// =============================================================================
// WORK ROLE HELPERS (identity/listing, NO admin shortcut)
// =============================================================================

/**
 * Check if user has a specific work role.
 * Does NOT give admin a free pass - only checks actual work roles.
 * Use for: filtering dropdowns, determining who shows up in role-specific lists
 */
export function hasWorkRole(user: RoleLike | null | undefined, role: WorkRole): boolean {
  if (!user) return false
  // Check new work_roles column first
  if (user.work_roles?.length) {
    return user.work_roles.includes(role)
  }
  // Fallback: filter admin from old roles[]
  const roles = getUserRoles(user)
  return roles.filter(r => r !== 'admin').includes(role)
}

/**
 * Check if user has any of the specified work roles.
 * Does NOT give admin a free pass - only checks actual work roles.
 * Use for: filtering users who can work in certain lanes
 */
export function hasAnyWorkRole(
  user: RoleLike | null | undefined,
  rolesToCheck: WorkRole[]
): boolean {
  if (!user) return false
  // Check new work_roles column first
  if (user.work_roles?.length) {
    return rolesToCheck.some(role => user.work_roles!.includes(role))
  }
  // Fallback: filter admin from old roles[]
  const roles = getUserRoles(user)
  const workRolesOnly = roles.filter(r => r !== 'admin')
  return rolesToCheck.some(role => workRolesOnly.includes(role))
}

/**
 * Get only the work roles (excludes 'admin').
 * Use for: displaying work role badges, work lane assignments
 */
export function getWorkRoles(user: RoleLike | null | undefined): WorkRole[] {
  if (!user) return []
  // Check new work_roles column first
  if (user.work_roles?.length) {
    return user.work_roles as WorkRole[]
  }
  // Fallback: filter admin from old roles[]
  const roles = getUserRoles(user)
  return roles.filter(r => r !== 'admin') as WorkRole[]
}

/**
 * Get the primary work role for display.
 * Use for: UI badges, display labels
 */
export function getPrimaryWorkRole(user: RoleLike | null | undefined): WorkRole | null {
  if (!user) return null
  // Check new primary_work_role column first
  if (user.primary_work_role) {
    return user.primary_work_role as WorkRole
  }
  // Fallback: use primary_role if not admin, or first work role
  if (user.primary_role && user.primary_role !== 'admin') {
    return user.primary_role as WorkRole
  }
  const workRoles = getWorkRoles(user)
  return workRoles[0] || null
}

// =============================================================================
// LEGACY HELPERS (admin = wildcard, kept for backward compatibility)
// TODO: Migrate usages to isAdminLike() + hasWorkRole() and remove these
// =============================================================================

/**
 * @deprecated Use isAdminLike() for permission checks, hasWorkRole() for work lanes
 */
export function userHasRole(user: RoleLike | null | undefined, role: UserRole): boolean {
  const roles = getUserRoles(user)
  return roles.includes('admin') || roles.includes(role)
}

/**
 * @deprecated Use isAdminLike() for permission checks, hasAnyWorkRole() for work lanes
 */
export function userHasAnyRole(
  user: RoleLike | null | undefined,
  rolesToCheck: UserRole[]
): boolean {
  const roles = getUserRoles(user)
  return roles.includes('admin') || rolesToCheck.some(role => roles.includes(role))
}
