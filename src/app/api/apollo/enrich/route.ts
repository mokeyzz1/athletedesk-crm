import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { enrichByEmail, enrichByLinkedIn, getOrganization } from '@/lib/integrations/apollo'

// POST - Enrich a contact or organization
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
      .eq('google_sso_id', user.id)
      .single() as { data: { id: string } | null }

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const internalUserId = userData.id

    const body = await request.json()
    const { email, linkedinUrl, domain, type = 'person' } = body

    if (type === 'organization' && domain) {
      // Enrich organization by domain
      const result = await getOrganization(internalUserId, domain)

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({ organization: result.organization })
    }

    // Enrich person
    if (!email && !linkedinUrl) {
      return NextResponse.json(
        { error: 'Email or LinkedIn URL required' },
        { status: 400 }
      )
    }

    let result

    if (linkedinUrl) {
      result = await enrichByLinkedIn(internalUserId, linkedinUrl)
    } else if (email) {
      result = await enrichByEmail(internalUserId, email)
    }

    if (!result || result.error) {
      return NextResponse.json(
        { error: result?.error || 'Enrichment failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      person: result.result?.person,
      organization: result.result?.organization,
    })
  } catch (error) {
    console.error('Apollo enrich error:', error)
    return NextResponse.json(
      { error: 'Failed to enrich contact' },
      { status: 500 }
    )
  }
}
