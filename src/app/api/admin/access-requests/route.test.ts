import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  userSingle: vi.fn(),
  requestUpdate: vi.fn(),
  requestSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: mocks.userSingle,
            }),
          }),
        }
      }

      const requestQuery = {
        update: mocks.requestUpdate,
        eq: vi.fn(),
        select: vi.fn(),
        single: mocks.requestSingle,
      }
      mocks.requestUpdate.mockReturnValue(requestQuery)
      requestQuery.eq.mockReturnValue(requestQuery)
      requestQuery.select.mockReturnValue(requestQuery)
      return requestQuery
    },
  }),
}))

import { PATCH } from './route'

describe('PATCH /api/admin/access-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'auth-user-id' } } })
    mocks.userSingle.mockResolvedValue({ data: { is_super_admin: true } })
    mocks.requestSingle.mockResolvedValue({
      data: {
        id: '6f7d7359-0973-4db0-96d9-3f7f563b202b',
        status: 'closed',
      },
      error: null,
    })
  })

  it('lets a super admin update a request status', async () => {
    const response = await PATCH(new Request('http://localhost/api/admin/access-requests', {
      method: 'PATCH',
      body: JSON.stringify({
        id: '6f7d7359-0973-4db0-96d9-3f7f563b202b',
        status: 'closed',
      }),
    }))

    expect(response.status).toBe(200)
    expect(mocks.requestUpdate).toHaveBeenCalledWith({ status: 'closed' })
  })

  it('rejects an unsupported status', async () => {
    const response = await PATCH(new Request('http://localhost/api/admin/access-requests', {
      method: 'PATCH',
      body: JSON.stringify({
        id: '6f7d7359-0973-4db0-96d9-3f7f563b202b',
        status: 'deleted',
      }),
    }))

    expect(response.status).toBe(400)
    expect(mocks.requestUpdate).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated requests', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const response = await PATCH(new Request('http://localhost/api/admin/access-requests', {
      method: 'PATCH',
      body: JSON.stringify({
        id: '6f7d7359-0973-4db0-96d9-3f7f563b202b',
        status: 'contacted',
      }),
    }))

    expect(response.status).toBe(401)
    expect(mocks.requestUpdate).not.toHaveBeenCalled()
  })
})
