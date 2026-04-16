import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for athlete server actions
 *
 * These test the validation and data transformation logic.
 * Actual Supabase calls are mocked.
 */

// Mock the auth module
vi.mock('./auth', () => ({
  getAuthContext: vi.fn(),
}))

// Mock the errors module
vi.mock('./errors', () => ({
  AuthError: class AuthError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'AuthError'
    }
  },
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createAthlete, updateAthlete, deleteAthlete, bulkCreateAthletes, selfAssignAthlete } from './athletes'
import { getAuthContext } from './auth'
import { AuthError } from './errors'
import { createClient } from '@/lib/supabase/server'

describe('Athlete Server Actions', () => {
  const mockOrganizationId = 'org-123-test'
  const mockUserId = 'user-456-test'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth mock
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: mockUserId,
      organizationId: mockOrganizationId,
      role: 'admin',
      roles: ['admin'],
      email: 'test@example.com',
    })
  })

  describe('createAthlete', () => {
    it('validates required fields', async () => {
      const result = await createAthlete({
        name: '',
        sport: 'Basketball',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Name is required')
      }
    })

    it('validates sport is required', async () => {
      const result = await createAthlete({
        name: 'John Doe',
        sport: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Sport is required')
      }
    })

    it('validates email format', async () => {
      const result = await createAthlete({
        name: 'John Doe',
        sport: 'Basketball',
        email: 'not-an-email',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Invalid email format')
      }
    })

    it('injects organization_id from auth context', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-athlete', organization_id: mockOrganizationId },
            error: null,
          }),
        }),
      })

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      } as never)

      await createAthlete({
        name: 'John Doe',
        sport: 'Basketball',
      })

      // Verify insert was called with organization_id
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: mockOrganizationId,
        })
      )
    })

    it('trims whitespace from inputs', async () => {
      // Test the trimming logic directly via validation
      // Empty after trim = invalid
      const emptyAfterTrim = await createAthlete({
        name: '   ',  // Just spaces
        sport: 'Basketball',
      })
      expect(emptyAfterTrim.success).toBe(false)

      // Name with extra whitespace passes validation when trimmed
      // (the actual trim happens in the action, validation checks trim())
      const withWhitespace = await createAthlete({
        name: '  Valid Name  ',
        sport: 'Basketball',
        email: 'invalid-still', // Bad email to force failure after name validation passes
      })
      // This proves 'name' validation passed (name was valid after trim)
      // but email validation caught the bad email
      expect(withWhitespace.success).toBe(false)
      if (!withWhitespace.success) {
        expect(withWhitespace.error).toBe('Invalid email format')
      }
    })

    it('returns error when not authenticated', async () => {
      vi.mocked(getAuthContext).mockRejectedValue(new AuthError('Not authenticated'))

      const result = await createAthlete({
        name: 'John Doe',
        sport: 'Basketball',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Not authenticated')
      }
    })
  })

  describe('updateAthlete', () => {
    it('validates name cannot be empty', async () => {
      const result = await updateAthlete('athlete-123', {
        name: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Name cannot be empty')
      }
    })

    it('validates marketability score range', async () => {
      const result = await updateAthlete('athlete-123', {
        marketability_score: 150,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Marketability score must be between 0 and 100')
      }
    })

    it('strips organization_id from update payload', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'athlete-123' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { name: 'Old Name', assigned_scout_id: null, assigned_agent_id: null, assigned_marketing_lead_id: null },
              error: null,
            }),
          }),
        }),
      })

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          update: mockUpdate,
        }),
      } as never)

      await updateAthlete('athlete-123', {
        name: 'Updated Name',
        organization_id: 'malicious-org-id', // Attempt to change org
      } as never)

      // Verify organization_id was NOT in the update
      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall).not.toHaveProperty('organization_id')
      expect(updateCall).toHaveProperty('name', 'Updated Name')
    })

    it('includes organization_id in WHERE clause', async () => {
      const mockEqOrg = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'athlete-123' },
            error: null,
          }),
        }),
      })

      const mockEqId = vi.fn().mockReturnValue({
        eq: mockEqOrg,
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEqId,
      })

      const mockSelectEqOrg = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { name: 'Old Name', assigned_scout_id: null, assigned_agent_id: null, assigned_marketing_lead_id: null },
          error: null,
        }),
      })

      const mockSelectEqId = vi.fn().mockReturnValue({
        eq: mockSelectEqOrg,
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockSelectEqId,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          update: mockUpdate,
        }),
      } as never)

      await updateAthlete('athlete-123', { name: 'Updated' })

      // Verify update chain includes both id and organization_id
      expect(mockEqId).toHaveBeenCalledWith('id', 'athlete-123')
      expect(mockEqOrg).toHaveBeenCalledWith('organization_id', mockOrganizationId)
    })
  })

  describe('deleteAthlete', () => {
    it('includes organization_id in WHERE clause', async () => {
      const mockEqOrg = vi.fn().mockResolvedValue({ error: null })
      const mockEqId = vi.fn().mockReturnValue({
        eq: mockEqOrg,
      })
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEqId,
      })

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: mockDelete,
        }),
      } as never)

      await deleteAthlete('athlete-123')

      expect(mockEqId).toHaveBeenCalledWith('id', 'athlete-123')
      expect(mockEqOrg).toHaveBeenCalledWith('organization_id', mockOrganizationId)
    })

    it('returns success with deleted id', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as never)

      const result = await deleteAthlete('athlete-123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('athlete-123')
      }
    })
  })

  describe('selfAssignAthlete', () => {
    it('calls secure RPC for staff self-assignment', async () => {
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrganizationId,
        role: 'scout',
        roles: ['scout'],
        email: 'scout@example.com',
      })

      const mockRpc = vi.fn().mockResolvedValue({
        data: { id: 'athlete-123', assigned_scout_id: mockUserId },
        error: null,
      })

      vi.mocked(createClient).mockResolvedValue({
        rpc: mockRpc,
      } as never)

      const result = await selfAssignAthlete('athlete-123')

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('self_assign_athlete', {
        p_athlete_id: 'athlete-123',
        p_assignment_role: 'scout',
      })
    })

    it('blocks roles that cannot self-assign before calling RPC', async () => {
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrganizationId,
        role: 'admin',
        roles: ['admin'],
        email: 'admin@example.com',
      })

      const mockRpc = vi.fn()
      vi.mocked(createClient).mockResolvedValue({
        rpc: mockRpc,
      } as never)

      const result = await selfAssignAthlete('athlete-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Your role cannot self-assign athletes')
      }
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('returns RPC errors such as already assigned', async () => {
      vi.mocked(getAuthContext).mockResolvedValue({
        userId: mockUserId,
        organizationId: mockOrganizationId,
        role: 'agent',
        roles: ['agent'],
        email: 'agent@example.com',
      })

      vi.mocked(createClient).mockResolvedValue({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Agent is already assigned' },
        }),
      } as never)

      const result = await selfAssignAthlete('athlete-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Agent is already assigned')
      }
    })

    it('returns auth errors', async () => {
      vi.mocked(getAuthContext).mockRejectedValue(new AuthError('Not authenticated'))

      const result = await selfAssignAthlete('athlete-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Not authenticated')
      }
    })
  })

  describe('bulkCreateAthletes', () => {
    it('validates all records and reports errors', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as never)

      const result = await bulkCreateAthletes([
        { name: '', sport: 'Basketball' }, // Invalid - no name
        { name: 'Valid', sport: '' }, // Invalid - no sport
        { name: 'Good Athlete', sport: 'Football' }, // Valid
      ])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.errors).toContain('Row 1: Name is required')
        expect(result.data.errors).toContain('Row 2: Sport is required')
      }
    })

    it('injects organization_id on all valid records', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1' }, { id: '2' }],
          error: null,
        }),
      })

      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      } as never)

      await bulkCreateAthletes([
        { name: 'Athlete 1', sport: 'Basketball' },
        { name: 'Athlete 2', sport: 'Football' },
      ])

      const insertedData = mockInsert.mock.calls[0][0]
      expect(insertedData).toHaveLength(2)
      expect(insertedData.every((a: { organization_id: string }) =>
        a.organization_id === mockOrganizationId
      )).toBe(true)
    })
  })
})
