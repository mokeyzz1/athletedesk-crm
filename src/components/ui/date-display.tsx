'use client'

import { formatDate, formatTime, isToday } from '@/lib/helpers'

interface DateDisplayProps {
  date: string | Date | null | undefined
  includeTime?: boolean
  relative?: boolean
  short?: boolean
  className?: string
  showTodayLabel?: boolean
}

/**
 * Client component that displays dates in user's local timezone
 */
export function DateDisplay({
  date,
  includeTime = false,
  relative = false,
  short = false,
  className = '',
  showTodayLabel = false,
}: DateDisplayProps) {
  if (!date) return null

  // Show "Today" label if requested and date is today
  if (showTodayLabel && isToday(date)) {
    if (includeTime) {
      return <span className={className}>Today at {formatTime(date)}</span>
    }
    return <span className={className}>Today</span>
  }

  return (
    <span className={className}>
      {formatDate(date, { includeTime, relative, short })}
    </span>
  )
}

/**
 * Display relative time (e.g., "2 hours ago")
 */
export function TimeAgo({ date, className = '' }: { date: string | Date | null | undefined; className?: string }) {
  if (!date) return null
  return <span className={className}>{formatDate(date, { relative: true })}</span>
}
