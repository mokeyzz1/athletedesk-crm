import { createClient } from '@/lib/supabase/server'
import type { User, EmailTemplate, RosterTeam, RecruitingRegion, Organization } from '@/lib/database.types'
import { isAdminLike } from '@/lib/roles'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user?.id ?? '')
    .single()

  const profile = data as User | null

  // Fetch organization data (for admins)
  let organization: Organization | null = null
  let isOwner = false

  if (isAdminLike(profile) && profile?.organization_id) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single()

    organization = orgData as Organization | null
    isOwner = organization?.owner_id === profile.id
  }

  // Fetch email templates (user's own + shared)
  const { data: templatesData } = await supabase
    .from('email_templates')
    .select('*')
    .or(`created_by.eq.${profile?.id ?? ''},is_shared.eq.true`)
    .order('name')

  const templates = (templatesData || []) as EmailTemplate[]

  // Fetch roster teams
  const { data: rosterTeamsData } = await supabase
    .from('roster_teams')
    .select('*')
    .order('name')

  const rosterTeams = (rosterTeamsData || []) as RosterTeam[]

  // Fetch recruiting regions
  const { data: recruitingRegionsData } = await supabase
    .from('recruiting_regions')
    .select('*')
    .order('name')

  const recruitingRegions = (recruitingRegionsData || []) as RecruitingRegion[]

  return (
    <SettingsClient
      profile={profile}
      initialTemplates={templates}
      initialRosterTeams={rosterTeams}
      initialRecruitingRegions={recruitingRegions}
      organization={organization}
      isOwner={isOwner}
    />
  )
}
