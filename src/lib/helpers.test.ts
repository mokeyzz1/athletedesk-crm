import { describe, it, expect } from 'vitest'
import {
  formatPhoneNumber,
  getInitials,
  calculateAge,
  filterByRegion,
  filterByClassYear,
  calculateRegionStats,
  isValidEmail,
  truncate,
  formatCurrency,
  parseOutreachStatus,
  getLocalDateString,
} from './helpers'

describe('formatPhoneNumber', () => {
  it('formats 10-digit phone numbers', () => {
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567')
  })

  it('handles phone with existing formatting', () => {
    expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567')
  })

  it('returns original if not 10 digits', () => {
    expect(formatPhoneNumber('123')).toBe('123')
  })

  it('handles phone with spaces and dashes', () => {
    expect(formatPhoneNumber('555 123 4567')).toBe('(555) 123-4567')
  })
})

describe('getInitials', () => {
  it('returns first two initials', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('handles single name', () => {
    expect(getInitials('LeBron')).toBe('L')
  })

  it('handles three names', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MJ')
  })

  it('handles empty string', () => {
    expect(getInitials('')).toBe('')
  })
})

describe('calculateAge', () => {
  it('calculates age correctly', () => {
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
    const birthDate = getLocalDateString(tenYearsAgo)
    expect(calculateAge(birthDate)).toBe(10)
  })

  it('handles birthday not yet occurred this year', () => {
    const today = new Date()
    const futureMonth = new Date(today.getFullYear() - 20, today.getMonth() + 1, 15)
    const birthDate = getLocalDateString(futureMonth)
    // Should be 19 since birthday hasn't happened yet
    expect(calculateAge(birthDate)).toBe(19)
  })
})

describe('filterByRegion', () => {
  const athletes = [
    { id: 1, name: 'Athlete 1', region: 'Northeast' },
    { id: 2, name: 'Athlete 2', region: 'Southeast' },
    { id: 3, name: 'Athlete 3', region: 'Northeast' },
    { id: 4, name: 'Athlete 4', region: null },
    { id: 5, name: 'Athlete 5', region: undefined },
  ]

  it('returns all athletes when region is null', () => {
    expect(filterByRegion(athletes, null)).toHaveLength(5)
  })

  it('filters by specific region', () => {
    const result = filterByRegion(athletes, 'Northeast')
    expect(result).toHaveLength(2)
    expect(result.every(a => a.region === 'Northeast')).toBe(true)
  })

  it('handles Unassigned region', () => {
    const result = filterByRegion(athletes, 'Unassigned')
    expect(result).toHaveLength(2)
  })

  it('returns empty array for non-existent region', () => {
    expect(filterByRegion(athletes, 'Antarctica')).toHaveLength(0)
  })
})

describe('filterByClassYear', () => {
  const athletes = [
    { id: 1, class_year: '2028' },
    { id: 2, class_year: '2027' },
    { id: 3, class_year: '2026' },
    { id: 4, class_year: '2025' },
    { id: 5, class_year: '2028' },
  ]

  it('returns all athletes when classYear is "all"', () => {
    expect(filterByClassYear(athletes, 'all')).toHaveLength(5)
  })

  it('filters by specific class year', () => {
    const result = filterByClassYear(athletes, '2028')
    expect(result).toHaveLength(2)
  })

  it('returns empty array for non-existent class year', () => {
    expect(filterByClassYear(athletes, '2030')).toHaveLength(0)
  })
})

describe('calculateRegionStats', () => {
  const athletes = [
    { id: 1, region: 'Northeast', outreach_status: 'not_contacted' },
    { id: 2, region: 'Northeast', outreach_status: 'contacted' },
    { id: 3, region: 'Northeast', outreach_status: 'contacted' },
    { id: 4, region: 'Southeast', outreach_status: 'interested' },
    { id: 5, region: null, outreach_status: 'dead_lead' },
  ]

  it('calculates totals per region', () => {
    const stats = calculateRegionStats(athletes, ['Northeast', 'Southeast', 'Unassigned'])
    expect(stats.find(s => s.region === 'Northeast')?.total).toBe(3)
    expect(stats.find(s => s.region === 'Southeast')?.total).toBe(1)
    expect(stats.find(s => s.region === 'Unassigned')?.total).toBe(1)
  })

  it('breaks down by status', () => {
    const stats = calculateRegionStats(athletes, ['Northeast'])
    const northeast = stats.find(s => s.region === 'Northeast')
    expect(northeast?.byStatus['not_contacted']).toBe(1)
    expect(northeast?.byStatus['contacted']).toBe(2)
    expect(northeast?.byStatus['interested']).toBe(0)
  })
})

describe('isValidEmail', () => {
  it('validates correct email', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
  })

  it('rejects email without @', () => {
    expect(isValidEmail('testexample.com')).toBe(false)
  })

  it('rejects email without domain', () => {
    expect(isValidEmail('test@')).toBe(false)
  })

  it('rejects email with spaces', () => {
    expect(isValidEmail('test @example.com')).toBe(false)
  })
})

describe('truncate', () => {
  it('truncates long text', () => {
    expect(truncate('This is a very long text', 10)).toBe('This is...')
  })

  it('returns original if shorter than max', () => {
    expect(truncate('Short', 10)).toBe('Short')
  })

  it('handles exact length', () => {
    expect(truncate('Exact', 5)).toBe('Exact')
  })
})

describe('formatCurrency', () => {
  it('formats whole numbers', () => {
    expect(formatCurrency(1000)).toBe('$1,000')
  })

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })
})

describe('parseOutreachStatus', () => {
  it('returns valid status', () => {
    expect(parseOutreachStatus('contacted')).toBe('contacted')
  })

  it('returns default for null', () => {
    expect(parseOutreachStatus(null)).toBe('not_contacted')
  })

  it('returns default for invalid status', () => {
    expect(parseOutreachStatus('invalid')).toBe('not_contacted')
  })
})
