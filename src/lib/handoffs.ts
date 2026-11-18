// Reserved region_assignments.region value: the org-wide fallback, used when an
// athlete has no region or their region has no default person set.
export const ORG_DEFAULT_REGION = '__all__'

export const regionLabel = (region: string) =>
  region === ORG_DEFAULT_REGION ? 'All other athletes (no region)' : region

export interface HandoffDefaults {
  region: string
  default_agent_id: string | null
  default_marketing_id: string | null
}

/** Region default wins; otherwise the org-wide fallback; otherwise nobody. */
export function pickDefaultAssignee(
  rows: HandoffDefaults[],
  region: string | null,
  field: 'default_agent_id' | 'default_marketing_id'
): string | null {
  const find = (name: string) => rows.find(row => row.region === name)?.[field] ?? null
  return (region ? find(region) : null) ?? find(ORG_DEFAULT_REGION)
}
