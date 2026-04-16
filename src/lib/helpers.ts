import { OutreachStatus, OUTREACH_STATUSES } from './constants'

/**
 * Parse a date string safely, handling YYYY-MM-DD as local date (not UTC)
 * This prevents timezone shifting for date-only strings
 */
export function parseDate(dateStr: string | Date | null | undefined): Date | null {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr

  // Detect YYYY-MM-DD format (date-only, no time)
  const dateOnlyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    // Parse as local date to avoid UTC shift
    const [, year, month, day] = dateOnlyMatch
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  // For timestamps with time component, parse normally
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Format a date for display in user's local timezone
 */
export function formatDate(
  dateStr: string | Date | null | undefined,
  options: {
    includeTime?: boolean
    relative?: boolean
    short?: boolean
  } = {}
): string {
  if (!dateStr) return ''

  const date = parseDate(dateStr)
  if (!date) return ''

  const { includeTime = false, relative = false, short = false } = options

  // Relative time (e.g., "2 hours ago", "in 3 days")
  if (relative) {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(Math.abs(diffMs) / (1000 * 60))
    const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
    const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))

    const isFuture = diffMs < 0

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return isFuture ? `in ${diffMins}m` : `${diffMins}m ago`
    if (diffHours < 24) return isFuture ? `in ${diffHours}h` : `${diffHours}h ago`
    if (diffDays < 7) return isFuture ? `in ${diffDays}d` : `${diffDays}d ago`
    // Fall through to absolute date
  }

  // Short format: "Mar 15" or "Mar 15, 3:30 PM"
  if (short) {
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (includeTime) {
      return date.toLocaleString(undefined, { ...dateOptions, hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString(undefined, dateOptions)
  }

  // Full format: "March 15, 2026" or "March 15, 2026 at 3:30 PM"
  const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
  if (includeTime) {
    return date.toLocaleString(undefined, { ...dateOptions, hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, dateOptions)
}

/**
 * Format time only (e.g., "3:30 PM")
 */
export function formatTime(dateStr: string | Date | null | undefined): string {
  const date = parseDate(dateStr)
  if (!date) return ''
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * Check if a date is today in user's local timezone
 */
export function isToday(dateStr: string | Date): boolean {
  const date = parseDate(dateStr)
  if (!date) return false
  const today = new Date()
  return date.toLocaleDateString() === today.toLocaleDateString()
}

/**
 * Check if a date is in the past (overdue)
 */
export function isPast(dateStr: string | Date): boolean {
  const date = parseDate(dateStr)
  if (!date) return false
  return date.getTime() < Date.now()
}

/**
 * Get start of today in user's local timezone
 */
export function getStartOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * Get local date string in YYYY-MM-DD format (user's timezone)
 * Use this instead of toISOString().split('T')[0] which gives UTC date
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get tomorrow's date string in YYYY-MM-DD format (user's timezone)
 */
export function getTomorrowDateString(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getLocalDateString(tomorrow)
}

/**
 * Check if a date string is overdue (before start of today in local timezone)
 */
export function isOverdue(dateStr: string | Date | null | undefined): boolean {
  const date = parseDate(dateStr)
  if (!date) return false
  const today = getStartOfToday()
  return date.getTime() < today.getTime()
}

/**
 * Check if a date string is due today (local timezone)
 */
export function isDueToday(dateStr: string | Date | null | undefined): boolean {
  const date = parseDate(dateStr)
  if (!date) return false
  const today = getStartOfToday()
  // Compare date portions only
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate()
}

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
  const birth = parseDate(birthDate)
  if (!birth) return 0
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
