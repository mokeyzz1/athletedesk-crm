import { describe, expect, it } from 'vitest'
import { normalizeClassYear, seniorClassYear } from './export'

const nov2026 = new Date(2026, 10, 18)

describe('seniorClassYear', () => {
  it('rolls over in August', () => {
    expect(seniorClassYear(new Date(2027, 4, 1))).toBe(2027)
    expect(seniorClassYear(new Date(2027, 7, 15))).toBe(2028)
    expect(seniorClassYear(nov2026)).toBe(2027)
  })
})

describe('normalizeClassYear', () => {
  it('reads years in the formats spreadsheets use', () => {
    expect(normalizeClassYear(2027, nov2026)).toBe('2027')
    expect(normalizeClassYear("'28", nov2026)).toBe('2028')
    expect(normalizeClassYear('Class of 2031', nov2026)).toBe('2031')
  })

  it('maps class words from the current school year, not a fixed one', () => {
    expect(normalizeClassYear('Senior', nov2026)).toBe('2027')
    expect(normalizeClassYear('Jr', nov2026)).toBe('2028')
    expect(normalizeClassYear('Sophomore', nov2026)).toBe('2029')
    expect(normalizeClassYear('Freshman', nov2026)).toBe('2030')
  })

  it('never returns a year the database would reject', () => {
    expect(normalizeClassYear(2024, nov2026)).toBe('n_a')
    expect(normalizeClassYear(2036, nov2026)).toBe('n_a')
    expect(normalizeClassYear('12', nov2026)).toBe('n_a')
    expect(normalizeClassYear('unknown', nov2026)).toBe('n_a')
    expect(normalizeClassYear('Pro', nov2026)).toBe('pro')
  })
})
