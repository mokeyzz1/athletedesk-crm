import { describe, expect, it } from 'vitest'
import {
  accessRequestStatusSchema,
  createAccessRequestDedupeKey,
} from './access-requests'

describe('access request duplicate protection', () => {
  it('normalizes email casing and whitespace within the same UTC day', () => {
    const now = new Date('2026-07-04T15:30:00.000Z')

    expect(createAccessRequestDedupeKey(' TEST@Example.com ', now))
      .toBe(createAccessRequestDedupeKey('test@example.com', now))
  })

  it('allows the same email to submit on a different UTC day', () => {
    const firstDay = new Date('2026-07-04T23:59:59.000Z')
    const secondDay = new Date('2026-07-05T00:00:00.000Z')

    expect(createAccessRequestDedupeKey('test@example.com', firstDay))
      .not.toBe(createAccessRequestDedupeKey('test@example.com', secondDay))
  })
})

describe('access request statuses', () => {
  it.each(['new', 'contacted', 'closed'])('accepts %s', status => {
    expect(accessRequestStatusSchema.safeParse(status).success).toBe(true)
  })

  it('rejects unknown statuses', () => {
    expect(accessRequestStatusSchema.safeParse('deleted').success).toBe(false)
  })
})
