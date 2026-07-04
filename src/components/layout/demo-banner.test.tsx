import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DemoBanner } from './demo-banner'

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mocks.signOut,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}))

describe('DemoBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signOut.mockResolvedValue({ error: null })
  })

  it('ends the demo session before opening owner sign-in', async () => {
    render(<DemoBanner />)

    fireEvent.click(screen.getByRole('button', { name: 'Owner sign in' }))

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce())
    expect(mocks.push).toHaveBeenCalledWith('/login?next=/admin')
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })
})
