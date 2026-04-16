import type { UserRole } from '@/lib/database.types'

type RoleLike = {
  role?: UserRole | string | null
  roles?: (UserRole | string)[] | null
  primary_role?: UserRole | string | null
}

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

export function userHasRole(user: RoleLike | null | undefined, role: UserRole): boolean {
  const roles = getUserRoles(user)
  return roles.includes('admin') || roles.includes(role)
}

export function userHasAnyRole(
  user: RoleLike | null | undefined,
  rolesToCheck: UserRole[]
): boolean {
  const roles = getUserRoles(user)
  return roles.includes('admin') || rolesToCheck.some(role => roles.includes(role))
}
