import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { searchPeople, findDecisionMakers, type ApolloSearchOptions } from '@/lib/integrations/apollo'

// POST - Search Apollo for contacts
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get internal user ID (integrations are stored with internal ID, not Google SSO ID)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single() as { data: { id: string } | null }

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const internalUserId = userData.id

    const body = await request.json()
    const {
      query,
      companyName,
      domain,
      titles,
      seniorities,
      decisionMakersOnly,
      page = 1,
      perPage = 25
    } = body

    let result

    if (decisionMakersOnly) {
      // Use the specialized decision makers search
      result = await findDecisionMakers(internalUserId, {
        companyName,
        domain,
      })
    } else {
      // Build search options
      const searchOptions: ApolloSearchOptions = {
        page,
        per_page: perPage,
      }

      if (query) {
        searchOptions.q_keywords = query
      }
      if (companyName) {
        searchOptions.q_organization_name = companyName
      }
      if (domain) {
        searchOptions.q_organization_domains = [domain]
      }
      if (titles && titles.length > 0) {
        searchOptions.person_titles = titles
      }
      if (seniorities && seniorities.length > 0) {
        searchOptions.person_seniorities = seniorities
      }

      result = await searchPeople(internalUserId, searchOptions)
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      people: result.people,
      totalCount: 'totalCount' in result ? result.totalCount : result.people.length,
    })
  } catch (error) {
    console.error('Apollo search error:', error)
    return NextResponse.json(
      { error: 'Failed to search Apollo' },
      { status: 500 }
    )
  }
}
