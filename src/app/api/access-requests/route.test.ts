import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      insert: mocks.insert,
    }),
  }),
}))

import { POST } from './route'

const validBody = {
  name: 'Jordan Taylor',
  agency: 'Taylor Sports',
  email: 'JORDAN@EXAMPLE.COM',
  rosterSize: '25-100',
}

describe('POST /api/access-requests', () => {
  beforeEach(() => {
    mocks.insert.mockReset()
  })

  it('normalizes the email and stores a dedupe key', async () => {
    mocks.insert.mockResolvedValue({ error: null })

    const response = await POST(new Request('http://localhost/api/access-requests', {
      method: 'POST',
      body: JSON.stringify(validBody),
    }))

    expect(response.status).toBe(200)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      email: 'jordan@example.com',
      dedupe_key: expect.stringMatching(/^[a-f0-9]{64}$/),
    }))
  })

  it('returns the same success response for a duplicate', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23505' } })

    const response = await POST(new Request('http://localhost/api/access-requests', {
      method: 'POST',
      body: JSON.stringify(validBody),
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
