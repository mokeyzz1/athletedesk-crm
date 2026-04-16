import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { userHasRole } from '@/lib/roles'
import type { UserRole } from '@/lib/database.types'

interface RegionAssignmentUpdate {
  region: string
  agent_ids: string[]
  marketing_ids: string[]
  primary_agent_id: string | null
  primary_marketing_id: string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get regions from recruiting_regions (source of truth)
  const { data: regions, error: regionsError } = await supabase
    .from('recruiting_regions')
    .select('name')
    .order('name')

  if (regionsError) {
    console.error('Error fetching recruiting regions:', regionsError)
    return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 })
  }

  // Get existing region assignments
  const { data: existingAssignments, error: assignmentsError } = await supabase
    .from('region_assignments')
    .select('*')

  if (assignmentsError) {
    console.error('Error fetching region assignments:', assignmentsError)
    return NextResponse.json({ error: 'Failed to fetch region assignments' }, { status: 500 })
  }

  // Create a map of existing assignments by region name
  const assignmentMap = new Map(
    (existingAssignments || []).map((a: { region: string }) => [a.region, a])
  )

  // Merge: for each recruiting_region, use existing assignment or create empty one
  const assignments = (regions || []).map((r: { name: string }) => {
    const existing = assignmentMap.get(r.name)
    if (existing) {
      return existing
    }
    // Return empty assignment structure for regions without assignments yet
    return {
      region: r.name,
      agent_ids: [],
      marketing_ids: [],
      primary_agent_id: null,
      primary_marketing_id: null,
      default_agent_id: null,
      default_marketing_id: null,
    }
  })

  // Get all agents and marketing users for the dropdowns
  const { data: agents, error: agentsError } = await supabase
    .from('users')
    .select('id, name, role, roles, assigned_regions')
    .order('name')

  if (agentsError) {
    console.error('Error fetching agents:', agentsError)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }

  const { data: marketingUsers, error: marketingError } = await supabase
    .from('users')
    .select('id, name, role, roles, assigned_regions')
    .order('name')

  if (marketingError) {
    console.error('Error fetching marketing users:', marketingError)
    return NextResponse.json({ error: 'Failed to fetch marketing users' }, { status: 500 })
  }

  return NextResponse.json({
    assignments,
    agents: (agents || []).filter(agent => userHasRole(agent, 'agent')),
    marketingUsers: (marketingUsers || []).filter(marketingUser => userHasRole(marketingUser, 'marketing')),
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin and get their organization_id
  const { data: currentUserData } = await supabase
    .from('users')
    .select('role, roles, organization_id')
    .eq('auth_user_id', user.id)
    .single()

  const currentUser = currentUserData as { role: UserRole; roles: UserRole[] | null; organization_id: string } | null

  if (!currentUser || !userHasRole(currentUser, 'admin')) {
    return NextResponse.json({ error: 'Only admins can manage region assignments' }, { status: 403 })
  }

  const body: RegionAssignmentUpdate = await request.json()
  const { region, agent_ids, marketing_ids, primary_agent_id, primary_marketing_id } = body

  if (!region) {
    return NextResponse.json({ error: 'Region is required' }, { status: 400 })
  }

  // Upsert the region assignment with organization_id
  const { data: assignment, error } = await supabase
    .from('region_assignments')
    .upsert(
      {
        organization_id: currentUser.organization_id,
        region,
        agent_ids: agent_ids || [],
        marketing_ids: marketing_ids || [],
        primary_agent_id: primary_agent_id || null,
        primary_marketing_id: primary_marketing_id || null,
        // Keep legacy fields in sync for backward compatibility
        default_agent_id: primary_agent_id || null,
        default_marketing_id: primary_marketing_id || null,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'organization_id,region' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error updating region assignment:', error)
    return NextResponse.json({ error: 'Failed to update region assignment' }, { status: 500 })
  }

  return NextResponse.json({ success: true, assignment })
}
