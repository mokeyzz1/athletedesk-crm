import { describe, it, expect } from 'vitest'
import {
  STATUS_COLORS,
  STATUS_BAR_COLORS,
  STATUS_LABELS,
  OUTREACH_STATUSES,
  CLASS_YEARS,
  REGIONS,
  OutreachStatus,
} from './constants'

describe('STATUS_COLORS', () => {
  it('has all required statuses', () => {
    OUTREACH_STATUSES.forEach(status => {
      expect(STATUS_COLORS[status]).toBeDefined()
    })
  })

  it('has valid tailwind classes', () => {
    Object.values(STATUS_COLORS).forEach(classes => {
      expect(classes).toMatch(/^bg-\w+-\d+ text-\w+-\d+$/)
    })
  })
})

describe('STATUS_BAR_COLORS', () => {
  it('has all required statuses', () => {
    OUTREACH_STATUSES.forEach(status => {
      expect(STATUS_BAR_COLORS[status]).toBeDefined()
    })
  })

  it('has valid tailwind bg classes', () => {
    Object.values(STATUS_BAR_COLORS).forEach(classes => {
      expect(classes).toMatch(/^bg-\w+-\d+$/)
    })
  })
})

describe('STATUS_LABELS', () => {
  it('has human-readable labels for all statuses', () => {
    OUTREACH_STATUSES.forEach(status => {
      expect(STATUS_LABELS[status]).toBeDefined()
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0)
    })
  })

  it('labels have proper capitalization', () => {
    Object.values(STATUS_LABELS).forEach(label => {
      expect(label[0]).toBe(label[0].toUpperCase())
    })
  })
})

describe('OUTREACH_STATUSES', () => {
  it('contains expected statuses', () => {
    expect(OUTREACH_STATUSES).toContain('not_contacted')
    expect(OUTREACH_STATUSES).toContain('contacted')
    expect(OUTREACH_STATUSES).toContain('signed')
  })

  it('has correct pipeline order', () => {
    expect(OUTREACH_STATUSES[0]).toBe('not_contacted')
    expect(OUTREACH_STATUSES[OUTREACH_STATUSES.length - 1]).toBe('signed')
  })
})

describe('CLASS_YEARS', () => {
  it('contains valid years', () => {
    CLASS_YEARS.forEach(year => {
      const numYear = parseInt(year)
      expect(numYear).toBeGreaterThanOrEqual(2020)
      expect(numYear).toBeLessThanOrEqual(2035)
    })
  })

  it('is sorted ascending', () => {
    const sorted = [...CLASS_YEARS].sort()
    expect(CLASS_YEARS).toEqual(sorted)
  })
})

describe('REGIONS', () => {
  it('contains US regions', () => {
    expect(REGIONS).toContain('Northeast')
    expect(REGIONS).toContain('Southeast')
    expect(REGIONS).toContain('Midwest')
    expect(REGIONS).toContain('Southwest')
    expect(REGIONS).toContain('West')
  })

  it('includes International', () => {
    expect(REGIONS).toContain('International')
  })
})
