import { getValidIntegration } from './token-refresh'

const APOLLO_API_BASE = 'https://api.apollo.io/v1'

export interface ApolloPerson {
  id: string
  first_name: string
  last_name: string
  name: string
  email: string
  email_status: 'verified' | 'unverified' | 'guessed' | null
  title: string | null
  headline: string | null
  linkedin_url: string | null
  photo_url: string | null
  city: string | null
  state: string | null
  country: string | null
  organization_id: string | null
  organization?: {
    id: string
    name: string
    website_url: string | null
    linkedin_url: string | null
    industry: string | null
    estimated_num_employees: number | null
  }
  phone_numbers?: Array<{
    raw_number: string
    sanitized_number: string
    type: string
    position: number
  }>
  departments?: string[]
  seniority?: string
}

export interface ApolloSearchOptions {
  q_keywords?: string
  person_titles?: string[]
  person_seniorities?: string[]
  q_organization_domains?: string[]
  q_organization_name?: string
  organization_industry_tag_ids?: string[]
  person_locations?: string[]
  page?: number
  per_page?: number
}

export interface ApolloEnrichmentResult {
  person: ApolloPerson | null
  organization: {
    id: string
    name: string
    website_url: string | null
    linkedin_url: string | null
    industry: string | null
    estimated_num_employees: number | null
    founded_year: number | null
    short_description: string | null
  } | null
}

/**
 * Get API key from stored integration
 * Apollo uses API keys, not OAuth tokens
 */
async function getApiKey(userId: string): Promise<string | null> {
  const integration = await getValidIntegration(userId, 'apollo')
  if (!integration) return null

  // Apollo can use either api_key or access_token depending on how it was connected
  return integration.api_key || integration.access_token || null
}

/**
 * Search for people in Apollo
 */
export async function searchPeople(
  userId: string,
  options: ApolloSearchOptions
): Promise<{ people: ApolloPerson[]; totalCount: number; error?: string }> {
  const apiKey = await getApiKey(userId)
  if (!apiKey) {
    return { people: [], totalCount: 0, error: 'No valid Apollo integration' }
  }

  try {
    const response = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        ...options,
        page: options.page || 1,
        per_page: options.per_page || 25,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Apollo search error:', error)
      return { people: [], totalCount: 0, error: 'Failed to search' }
    }

    const data = await response.json()
    return {
      people: data.people || [],
      totalCount: data.pagination?.total_entries || 0,
    }
  } catch (error) {
    console.error('Apollo API error:', error)
    return { people: [], totalCount: 0, error: 'API request failed' }
  }
}

/**
 * Enrich a contact by email
 */
export async function enrichByEmail(
  userId: string,
  email: string
): Promise<{ result?: ApolloEnrichmentResult; error?: string }> {
  const apiKey = await getApiKey(userId)
  if (!apiKey) {
    return { error: 'No valid Apollo integration' }
  }

  try {
    const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        email,
        reveal_personal_emails: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Apollo enrich error:', error)
      return { error: 'Failed to enrich contact' }
    }

    const data = await response.json()
    return {
      result: {
        person: data.person || null,
        organization: data.person?.organization || null,
      },
    }
  } catch (error) {
    console.error('Apollo API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * Enrich a contact by LinkedIn URL
 */
export async function enrichByLinkedIn(
  userId: string,
  linkedinUrl: string
): Promise<{ result?: ApolloEnrichmentResult; error?: string }> {
  const apiKey = await getApiKey(userId)
  if (!apiKey) {
    return { error: 'No valid Apollo integration' }
  }

  try {
    const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        linkedin_url: linkedinUrl,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Apollo enrich error:', error)
      return { error: 'Failed to enrich contact' }
    }

    const data = await response.json()
    return {
      result: {
        person: data.person || null,
        organization: data.person?.organization || null,
      },
    }
  } catch (error) {
    console.error('Apollo API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * Find contacts at a company by domain
 */
export async function findCompanyContacts(
  userId: string,
  options: {
    domain: string
    titles?: string[]
    seniorities?: string[]
    limit?: number
  }
): Promise<{ people: ApolloPerson[]; error?: string }> {
  return searchPeople(userId, {
    q_organization_domains: [options.domain],
    person_titles: options.titles,
    person_seniorities: options.seniorities,
    per_page: options.limit || 10,
  }).then(({ people, error }) => ({ people, error }))
}

/**
 * Search for decision makers at a company
 */
export async function findDecisionMakers(
  userId: string,
  options: {
    companyName?: string
    domain?: string
    departments?: string[]
  }
): Promise<{ people: ApolloPerson[]; error?: string }> {
  const searchOptions: ApolloSearchOptions = {
    person_seniorities: ['c_suite', 'vp', 'director', 'manager'],
    per_page: 25,
  }

  if (options.domain) {
    searchOptions.q_organization_domains = [options.domain]
  } else if (options.companyName) {
    searchOptions.q_organization_name = options.companyName
  }

  return searchPeople(userId, searchOptions).then(({ people, error }) => ({
    people,
    error,
  }))
}

/**
 * Get organization details by domain
 */
export async function getOrganization(
  userId: string,
  domain: string
): Promise<{ organization?: ApolloEnrichmentResult['organization']; error?: string }> {
  const apiKey = await getApiKey(userId)
  if (!apiKey) {
    return { error: 'No valid Apollo integration' }
  }

  try {
    const response = await fetch(`${APOLLO_API_BASE}/organizations/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({ domain }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Apollo org enrich error:', error)
      return { error: 'Failed to fetch organization' }
    }

    const data = await response.json()
    return { organization: data.organization || null }
  } catch (error) {
    console.error('Apollo API error:', error)
    return { error: 'API request failed' }
  }
}
