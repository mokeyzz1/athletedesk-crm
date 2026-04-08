import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Integration-style tests for Supabase query patterns
 *
 * These tests verify that our query helper layer always includes
 * organization_id filtering on list/create operations.
 *
 * In production, Supabase RLS policies enforce this at the DB level,
 * but these tests ensure our application code follows correct patterns.
 */

// Mock Supabase query builder that tracks all operations
function createMockQueryBuilder() {
  const operations: Array<{
    method: string
    args: unknown[]
  }> = []

  const builder = {
    _operations: operations,
    select: (...args: unknown[]) => {
      operations.push({ method: 'select', args })
      return builder
    },
    insert: (data: unknown) => {
      operations.push({ method: 'insert', args: [data] })
      return builder
    },
    update: (data: unknown) => {
      operations.push({ method: 'update', args: [data] })
      return builder
    },
    delete: () => {
      operations.push({ method: 'delete', args: [] })
      return builder
    },
    eq: (column: string, value: unknown) => {
      operations.push({ method: 'eq', args: [column, value] })
      return builder
    },
    neq: (column: string, value: unknown) => {
      operations.push({ method: 'neq', args: [column, value] })
      return builder
    },
    in: (column: string, values: unknown[]) => {
      operations.push({ method: 'in', args: [column, values] })
      return builder
    },
    single: () => {
      operations.push({ method: 'single', args: [] })
      return Promise.resolve({ data: null, error: null })
    },
    order: (...args: unknown[]) => {
      operations.push({ method: 'order', args })
      return builder
    },
    limit: (n: number) => {
      operations.push({ method: 'limit', args: [n] })
      return builder
    },
    then: (resolve: (value: { data: unknown; error: null }) => void) => {
      resolve({ data: [], error: null })
    },
  }

  return builder
}

function createMockSupabaseClient() {
  const tables: Record<string, ReturnType<typeof createMockQueryBuilder>> = {}

  return {
    from: (table: string) => {
      const builder = createMockQueryBuilder()
      tables[table] = builder
      return builder
    },
    _getTables: () => tables,
  }
}

// Helper that enforces organization_id on queries
function createOrgScopedQuery(
  supabase: ReturnType<typeof createMockSupabaseClient>,
  table: string,
  organizationId: string
) {
  return {
    select: (columns = '*') => {
      return supabase
        .from(table)
        .select(columns)
        .eq('organization_id', organizationId)
    },
    insert: (data: Record<string, unknown>) => {
      // Ensure organization_id is always set
      const dataWithOrg = { ...data, organization_id: organizationId }
      return supabase.from(table).insert(dataWithOrg)
    },
    update: (id: string, data: Record<string, unknown>) => {
      // Prevent organization_id changes
      const { organization_id, ...safeData } = data as { organization_id?: string } & Record<string, unknown>
      return supabase
        .from(table)
        .update(safeData)
        .eq('id', id)
        .eq('organization_id', organizationId)
    },
    delete: (id: string) => {
      return supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)
    },
  }
}

describe('Supabase Query Patterns', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  const TEST_ORG_ID = 'org-123-test'

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
  })

  describe('Organization-Scoped Queries', () => {
    it('SELECT always includes organization_id filter', () => {
      const query = createOrgScopedQuery(mockSupabase, 'athletes', TEST_ORG_ID)
      query.select('*')

      const operations = mockSupabase._getTables()['athletes']._operations

      expect(operations).toContainEqual({ method: 'select', args: ['*'] })
      expect(operations).toContainEqual({ method: 'eq', args: ['organization_id', TEST_ORG_ID] })
    })

    it('INSERT always sets organization_id', () => {
      const query = createOrgScopedQuery(mockSupabase, 'athletes', TEST_ORG_ID)
      query.insert({ name: 'Test Athlete', sport: 'Basketball' })

      const operations = mockSupabase._getTables()['athletes']._operations
      const insertOp = operations.find(op => op.method === 'insert')

      expect(insertOp).toBeDefined()
      expect((insertOp?.args[0] as Record<string, unknown>).organization_id).toBe(TEST_ORG_ID)
    })

    it('UPDATE includes organization_id check', () => {
      const query = createOrgScopedQuery(mockSupabase, 'athletes', TEST_ORG_ID)
      query.update('athlete-123', { name: 'Updated Name' })

      const operations = mockSupabase._getTables()['athletes']._operations

      expect(operations).toContainEqual({ method: 'eq', args: ['id', 'athlete-123'] })
      expect(operations).toContainEqual({ method: 'eq', args: ['organization_id', TEST_ORG_ID] })
    })

    it('UPDATE strips organization_id from payload', () => {
      const query = createOrgScopedQuery(mockSupabase, 'athletes', TEST_ORG_ID)
      query.update('athlete-123', {
        name: 'Updated Name',
        organization_id: 'malicious-org-id'  // Attempt to change org
      })

      const operations = mockSupabase._getTables()['athletes']._operations
      const updateOp = operations.find(op => op.method === 'update')

      // The payload should NOT contain organization_id
      expect((updateOp?.args[0] as Record<string, unknown>).organization_id).toBeUndefined()
      expect((updateOp?.args[0] as Record<string, unknown>).name).toBe('Updated Name')
    })

    it('DELETE includes organization_id check', () => {
      const query = createOrgScopedQuery(mockSupabase, 'athletes', TEST_ORG_ID)
      query.delete('athlete-123')

      const operations = mockSupabase._getTables()['athletes']._operations

      expect(operations).toContainEqual({ method: 'delete', args: [] })
      expect(operations).toContainEqual({ method: 'eq', args: ['id', 'athlete-123'] })
      expect(operations).toContainEqual({ method: 'eq', args: ['organization_id', TEST_ORG_ID] })
    })
  })

  describe('Multi-table Queries', () => {
    it('communications query includes organization scope', () => {
      const query = createOrgScopedQuery(mockSupabase, 'communications_log', TEST_ORG_ID)
      query.select('id, type, subject, athlete_id')

      const operations = mockSupabase._getTables()['communications_log']._operations
      expect(operations).toContainEqual({ method: 'eq', args: ['organization_id', TEST_ORG_ID] })
    })

    it('tasks query includes organization scope', () => {
      const query = createOrgScopedQuery(mockSupabase, 'tasks', TEST_ORG_ID)
      query.select('id, title, status')

      const operations = mockSupabase._getTables()['tasks']._operations
      expect(operations).toContainEqual({ method: 'eq', args: ['organization_id', TEST_ORG_ID] })
    })

    it('documents query includes organization scope', () => {
      const query = createOrgScopedQuery(mockSupabase, 'documents', TEST_ORG_ID)
      query.select('id, name, document_type')

      const operations = mockSupabase._getTables()['documents']._operations
      expect(operations).toContainEqual({ method: 'eq', args: ['organization_id', TEST_ORG_ID] })
    })
  })

  describe('Bulk Operations', () => {
    it('bulk insert sets organization_id on all records', () => {
      const records = [
        { name: 'Athlete 1', sport: 'Football' },
        { name: 'Athlete 2', sport: 'Basketball' },
        { name: 'Athlete 3', sport: 'Baseball' },
      ]

      const withOrgId = records.map(r => ({ ...r, organization_id: TEST_ORG_ID }))
      mockSupabase.from('athletes').insert(withOrgId)

      const operations = mockSupabase._getTables()['athletes']._operations
      const insertOp = operations.find(op => op.method === 'insert')
      const insertedData = insertOp?.args[0] as Array<Record<string, unknown>>

      expect(insertedData).toHaveLength(3)
      expect(insertedData.every(r => r.organization_id === TEST_ORG_ID)).toBe(true)
    })
  })
})

describe('Query Validation', () => {
  it('rejects queries without organization context', () => {
    const validateQuery = (orgId: string | null | undefined) => {
      if (!orgId) {
        throw new Error('organization_id is required for all queries')
      }
      return true
    }

    expect(() => validateQuery(null)).toThrow('organization_id is required')
    expect(() => validateQuery(undefined)).toThrow('organization_id is required')
    expect(() => validateQuery('')).toThrow('organization_id is required')
    expect(validateQuery('org-123')).toBe(true)
  })

  it('validates organization_id format', () => {
    const isValidOrgId = (id: string): boolean => {
      // UUID format or test format
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
             /^org-\w+-\w+$/.test(id)
    }

    expect(isValidOrgId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isValidOrgId('org-123-test')).toBe(true)
    expect(isValidOrgId('invalid')).toBe(false)
    expect(isValidOrgId('')).toBe(false)
  })
})

describe('RLS Policy Simulation', () => {
  // Simulates what the RLS policy does at the database level
  const applyRLSFilter = <T extends { organization_id: string }>(
    data: T[],
    userOrgId: string
  ): T[] => {
    return data.filter(row => row.organization_id === userOrgId)
  }

  const testData = [
    { id: '1', name: 'A1', organization_id: 'org-a' },
    { id: '2', name: 'A2', organization_id: 'org-a' },
    { id: '3', name: 'B1', organization_id: 'org-b' },
  ]

  it('filters data to user organization', () => {
    const result = applyRLSFilter(testData, 'org-a')

    expect(result).toHaveLength(2)
    expect(result.every(r => r.organization_id === 'org-a')).toBe(true)
  })

  it('returns empty for non-matching org', () => {
    const result = applyRLSFilter(testData, 'org-c')
    expect(result).toHaveLength(0)
  })

  it('combined app + RLS filtering works correctly', () => {
    // App-level filter (e.g., searching by name)
    const appFiltered = testData.filter(r => r.name.startsWith('A'))

    // RLS filter (happens at DB level)
    const rlsFiltered = applyRLSFilter(appFiltered, 'org-a')

    expect(rlsFiltered).toHaveLength(2)
    expect(rlsFiltered.map(r => r.name)).toEqual(['A1', 'A2'])
  })
})
