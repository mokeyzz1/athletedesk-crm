import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  profileSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
      signInWithPassword: mocks.signInWithPassword,
    },
  }),
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mocks.profileSingle,
        }),
      }),
    }),
  }),
}))

import { GET } from './route'

describe('GET /api/demo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DEMO_USER_PASSWORD = 'demo-password'
    mocks.signInWithPassword.mockResolvedValue({ error: null })
  })

  it('sends an existing super admin to the control center without replacing their session', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'owner-auth-id', email: 'moseskorom82@gmail.com' } },
    })
    mocks.profileSingle.mockResolvedValue({ data: { is_super_admin: true } })

    const response = await GET(new Request('http://localhost/api/demo'))

    expect(response.headers.get('location')).toBe('http://localhost/admin')
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })

  it('keeps an existing CRM user in their workspace', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'member-auth-id', email: 'member@example.com' } },
    })
    mocks.profileSingle.mockResolvedValue({ data: { is_super_admin: false } })

    const response = await GET(new Request('http://localhost/api/demo'))

    expect(response.headers.get('location')).toBe('http://localhost/dashboard')
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })

  it('signs an anonymous visitor into the shared demo', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const response = await GET(new Request('http://localhost/api/demo'))

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'demo@athletedesk.app',
      password: 'demo-password',
    })
    expect(response.headers.get('location')).toBe('http://localhost/dashboard')
  })
})
