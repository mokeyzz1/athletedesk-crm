import { describe, expect, it } from 'vitest'
import { ORG_DEFAULT_REGION, pickDefaultAssignee } from './handoffs'

const rows = [
  { region: 'Southeast', default_agent_id: 'se-agent', default_marketing_id: null },
  { region: ORG_DEFAULT_REGION, default_agent_id: 'fallback-agent', default_marketing_id: 'fallback-mkt' },
]

describe('pickDefaultAssignee', () => {
  it('prefers the region default', () => {
    expect(pickDefaultAssignee(rows, 'Southeast', 'default_agent_id')).toBe('se-agent')
  })

  it('falls back when the athlete has no region', () => {
    expect(pickDefaultAssignee(rows, null, 'default_agent_id')).toBe('fallback-agent')
  })

  it('falls back when the region has no default for that role', () => {
    expect(pickDefaultAssignee(rows, 'Southeast', 'default_marketing_id')).toBe('fallback-mkt')
  })

  it('falls back when the region has no row at all', () => {
    expect(pickDefaultAssignee(rows, 'Midwest', 'default_agent_id')).toBe('fallback-agent')
  })

  it('assigns nobody when no fallback is configured', () => {
    expect(pickDefaultAssignee([rows[0]], 'Midwest', 'default_agent_id')).toBeNull()
    expect(pickDefaultAssignee([], null, 'default_marketing_id')).toBeNull()
  })
})
