import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // Get all region assignments with user details
  const { data: assignments, error } = await supabase
    .from('region_assignments')
    .select('*')
    .order('region')

  if (error) {
    console.error('Error fetching region assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch region assignments' }, { status: 500 })
  }

  // Get all agents and marketing users for the dropdowns
  const { data: agents } = await supabase
    .from('users')
    .select('id, name, role, assigned_regions')
    .in('role', ['agent', 'admin'])
    .order('name')

  const { data: marketingUsers } = await supabase
    .from('users')
    .select('id, name, role, assigned_regions')
    .in('role', ['marketing', 'admin'])
    .order('name')

  return NextResponse.json({
    assignments: assignments || [],
    agents: agents || [],
    marketingUsers: marketingUsers || [],
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const { data: currentUserData } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  const currentUser = currentUserData as { role: string } | null

  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can manage region assignments' }, { status: 403 })
  }

  const body: RegionAssignmentUpdate = await request.json()
  const { region, agent_ids, marketing_ids, primary_agent_id, primary_marketing_id } = body

  if (!region) {
    return NextResponse.json({ error: 'Region is required' }, { status: 400 })
  }

  // Upsert the region assignment
  const { data: assignment, error } = await supabase
    .from('region_assignments')
    .upsert(
      {
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
      { onConflict: 'region' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error updating region assignment:', error)
    return NextResponse.json({ error: 'Failed to update region assignment' }, { status: 500 })
  }

  return NextResponse.json({ success: true, assignment })
}
