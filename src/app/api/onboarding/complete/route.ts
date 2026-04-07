import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface PendingUser {
  name: string
  email: string
  google_sso_id: string
  avatar_url: string | null
  invite_id: string
  invite_type: 'new_org' | 'join_org'
  organization_id: string | null
  organization_name: string | null
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const pendingUserCookie = cookieStore.get('pending_user')

  if (!pendingUserCookie?.value) {
    return NextResponse.json({ error: 'No pending user' }, { status: 401 })
  }

  let pendingUser: PendingUser
  try {
    pendingUser = JSON.parse(pendingUserCookie.value)
  } catch {
    return NextResponse.json({ error: 'Invalid pending user data' }, { status: 400 })
  }

  const body = await request.json()
  const { agencyName, agencyType, selectedSports, logoUrl } = body

  // Validate for new_org invites
  if (pendingUser.invite_type === 'new_org') {
    if (!agencyName || !agencyType || !selectedSports?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
  }

  const supabase = await createClient()

  try {
    let organizationId = pendingUser.organization_id

    // Create new organization for new_org invites
    if (pendingUser.invite_type === 'new_org') {
      // Generate slug from agency name
      const slug = agencyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      // Check for slug collision
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single()

      const finalSlug = existingOrg ? `${slug}-${Date.now()}` : slug

      // Create organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: agencyName,
          slug: finalSlug,
          logo_url: logoUrl || null,
          settings: {
            agency_type: agencyType,
            sports_focus: selectedSports,
          },
        } as never)
        .select('id')
        .single()

      if (orgError || !newOrg) {
        console.error('Failed to create organization:', orgError)
        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
      }

      organizationId = (newOrg as { id: string }).id
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization ID' }, { status: 400 })
    }

    // Create user record
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: pendingUser.name,
        email: pendingUser.email,
        google_sso_id: pendingUser.google_sso_id,
        avatar_url: pendingUser.avatar_url,
        role: pendingUser.invite_type === 'new_org' ? 'admin' : 'intern', // New org owners are admins
        organization_id: organizationId,
        is_super_admin: false,
      } as never)
      .select('id')
      .single()

    if (userError || !newUser) {
      console.error('Failed to create user:', userError)
      // Try to clean up org if we created one
      if (pendingUser.invite_type === 'new_org' && organizationId) {
        await supabase.from('organizations').delete().eq('id', organizationId)
      }
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const userId = (newUser as { id: string }).id

    // Set organization owner for new orgs
    if (pendingUser.invite_type === 'new_org') {
      await supabase
        .from('organizations')
        .update({ owner_id: userId } as never)
        .eq('id', organizationId)
    }

    // Mark invite as accepted
    await supabase.rpc('accept_invite' as never, {
      invite_token: cookieStore.get('invite_token')?.value || '',
      accepting_user_id: userId,
    } as never)

    // Clear cookies
    const response = NextResponse.json({ success: true })
    response.cookies.delete('pending_user')
    response.cookies.delete('invite_token')

    return response
  } catch (err) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
