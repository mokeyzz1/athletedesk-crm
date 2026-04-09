import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Delete an organization
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client to bypass RLS for admin operations
  const serviceClient = createServiceClient()

  // Check if user is super admin
  const { data: userData } = await serviceClient
    .from('users')
    .select('id, is_super_admin')
    .eq('auth_user_id', user.id)
    .single() as { data: { id: string; is_super_admin: boolean } | null }

  if (!userData?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete in order to respect foreign key constraints:
  // 1. Delete all related data for the organization
  // 2. Delete users in the organization
  // 3. Delete the organization

  try {
    // Get all athletes in this org to delete their related data
    const { data: athletes } = await serviceClient
      .from('athletes')
      .select('id')
      .eq('organization_id', id) as { data: { id: string }[] | null }

    const athleteIds = (athletes || []).map(a => a.id)

    if (athleteIds.length > 0) {
      // Delete athlete-related data
      await serviceClient.from('communications_log').delete().in('athlete_id', athleteIds)
      await serviceClient.from('brand_outreach').delete().in('athlete_id', athleteIds)
      await serviceClient.from('financial_tracking').delete().in('athlete_id', athleteIds)
      await serviceClient.from('documents').delete().in('athlete_id', athleteIds)
      await serviceClient.from('recruiting_pipeline').delete().in('athlete_id', athleteIds)
      await serviceClient.from('contracts').delete().in('athlete_id', athleteIds)
      await serviceClient.from('calendar_events').delete().in('athlete_id', athleteIds)
    }

    // Delete tasks for users in this org
    const { data: orgUsers } = await serviceClient
      .from('users')
      .select('id')
      .eq('organization_id', id) as { data: { id: string }[] | null }

    const userIds = (orgUsers || []).map(u => u.id)

    if (userIds.length > 0) {
      await serviceClient.from('tasks').delete().in('assigned_to', userIds)
      await serviceClient.from('task_comments').delete().in('user_id', userIds)
      await serviceClient.from('outreach_goals').delete().in('staff_id', userIds)
      await serviceClient.from('user_integrations').delete().in('user_id', userIds)
    }

    // Delete athletes
    await serviceClient.from('athletes').delete().eq('organization_id', id)

    // Delete region assignments
    await serviceClient.from('region_assignments').delete().eq('organization_id', id)

    // Delete users (but not super admins)
    await serviceClient
      .from('users')
      .delete()
      .eq('organization_id', id)
      .eq('is_super_admin', false)

    // Finally delete the organization
    const { error: orgError } = await serviceClient
      .from('organizations')
      .delete()
      .eq('id', id)

    if (orgError) {
      console.error('Failed to delete organization:', orgError)
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete organization error:', err)
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
  }
}
