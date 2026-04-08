import { OutreachStatus, OUTREACH_STATUSES } from './constants'

/**
 * Format a phone number to (XXX) XXX-XXXX
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Get initials from a name (max 2 characters)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Filter athletes by region
 */
export function filterByRegion<T extends { region?: string | null }>(
  athletes: T[],
  region: string | null
): T[] {
  if (!region) return athletes
  if (region === 'Unassigned') {
    return athletes.filter(a => !a.region)
  }
  return athletes.filter(a => a.region === region)
}

/**
 * Filter athletes by class year
 */
export function filterByClassYear<T extends { class_year?: string | null }>(
  athletes: T[],
  classYear: string
): T[] {
  if (classYear === 'all') return athletes
  return athletes.filter(a => a.class_year === classYear)
}

/**
 * Calculate status breakdown for a region
 */
export function calculateRegionStats<T extends { region?: string | null; outreach_status?: string }>(
  athletes: T[],
  regions: string[]
): { region: string; total: number; byStatus: Record<string, number> }[] {
  return regions.map(region => {
    const inRegion = filterByRegion(athletes, region)
    const byStatus: Record<string, number> = {}

    for (const status of OUTREACH_STATUSES) {
      byStatus[status] = inRegion.filter(a => a.outreach_status === status).length
    }

    return {
      region,
      total: inRegion.length,
      byStatus,
    }
  })
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Parse status from string with fallback
 */
export function parseOutreachStatus(status: string | null | undefined): OutreachStatus {
  if (status && OUTREACH_STATUSES.includes(status as OutreachStatus)) {
    return status as OutreachStatus
  }
  return 'not_contacted'
}
