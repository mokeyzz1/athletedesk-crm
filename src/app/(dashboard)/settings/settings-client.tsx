'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User, EmailTemplate, RosterTeam, RecruitingRegion, Organization, IntegrationProvider } from '@/lib/database.types'
import { US_STATES } from '@/lib/database.types'

interface Integration {
  id: string
  provider: IntegrationProvider
  account_email: string | null
  account_name: string | null
  is_active: boolean
  created_at: string
}

interface SettingsClientProps {
  profile: User | null
  initialTemplates: EmailTemplate[]
  initialRosterTeams: RosterTeam[]
  initialRecruitingRegions: RecruitingRegion[]
  organization: Organization | null
  isOwner: boolean
}

type SettingsSection = 'profile' | 'notifications' | 'signature' | 'templates' | 'integrations' | 'team' | 'goals' | 'regions' | 'roster-teams' | 'handoffs' | 'organization'

export function SettingsClient({ profile, initialTemplates, initialRosterTeams, initialRecruitingRegions, organization, isOwner }: SettingsClientProps) {
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  // Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loadingIntegrations, setLoadingIntegrations] = useState(false)
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const [gmailEmail, setGmailEmail] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [showApolloModal, setShowApolloModal] = useState(false)
  const [apolloApiKey, setApolloApiKey] = useState('')
  const [savingApollo, setSavingApollo] = useState(false)
  const [apolloError, setApolloError] = useState('')

  // Switch to integrations tab if integration param is present (after OAuth callback)
  useEffect(() => {
    const gmailParam = searchParams.get('gmail')
    const integrationParam = searchParams.get('integration')
    if (gmailParam || integrationParam) {
      setActiveSection('integrations')
      // Auto-open Apollo modal if redirected from /api/integrations/apollo
      if (integrationParam === 'apollo') {
        setShowApolloModal(true)
      }
    }
  }, [searchParams])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdown) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target && !target.closest('[data-dropdown]')) {
        setOpenDropdown(null)
      }
    }

    // Use setTimeout to avoid closing immediately on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [openDropdown])

  // Fetch integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      setLoadingIntegrations(true)
      try {
        // Fetch regular integrations
        const response = await fetch('/api/integrations')
        const data = await response.json()
        if (data.integrations) {
          setIntegrations(data.integrations)
        }

        // Fetch Gmail status separately
        const gmailRes = await fetch('/api/gmail/status')
        const gmailData = await gmailRes.json()
        setGmailConnected(gmailData.connected)
        setGmailEmail(gmailData.email)
      } catch (error) {
        console.error('Failed to fetch integrations:', error)
      }
      setLoadingIntegrations(false)
    }
    fetchIntegrations()
  }, [searchParams]) // Refetch after OAuth callback

  const isIntegrationConnected = (provider: IntegrationProvider) => {
    return integrations.some(i => i.provider === provider && i.is_active)
  }

  const getIntegration = (provider: IntegrationProvider) => {
    return integrations.find(i => i.provider === provider)
  }

  const disconnectIntegration = async (provider: IntegrationProvider) => {
    if (!confirm(`Are you sure you want to disconnect ${provider.replace('_', ' ')}?`)) {
      return
    }
    try {
      const response = await fetch('/api/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      if (response.ok) {
        setIntegrations(prev => prev.filter(i => i.provider !== provider))
      }
    } catch (error) {
      console.error('Failed to disconnect integration:', error)
    }
    setOpenDropdown(null)
  }

  const disconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail?')) {
      return
    }
    try {
      const response = await fetch('/api/gmail/disconnect', {
        method: 'POST',
      })
      if (response.ok) {
        setGmailConnected(false)
        setGmailEmail(null)
      }
    } catch (error) {
      console.error('Failed to disconnect Gmail:', error)
    }
    setOpenDropdown(null)
  }

  const saveApolloApiKey = async () => {
    if (!apolloApiKey.trim()) return
    setSavingApollo(true)
    setApolloError('')

    try {
      const response = await fetch('/api/integrations/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apolloApiKey.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setApolloError(data.error || 'Failed to save API key')
        setSavingApollo(false)
        return
      }

      // Refresh integrations list
      const integrationsRes = await fetch('/api/integrations')
      const integrationsData = await integrationsRes.json()
      if (integrationsData.integrations) {
        setIntegrations(integrationsData.integrations)
      }

      setShowApolloModal(false)
      setApolloApiKey('')
    } catch (error) {
      console.error('Failed to save Apollo API key:', error)
      setApolloError('Failed to save API key')
    }
    setSavingApollo(false)
  }

  // Notification state - initialized from profile
  const [notifications, setNotifications] = useState({
    emailFollowUps: profile?.notify_follow_ups ?? true,
    emailTaskReminders: profile?.notify_task_reminders ?? true,
    emailWeeklySummary: profile?.notify_weekly_summary ?? false,
    emailNewAssignments: profile?.notify_new_assignments ?? true,
  })
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [notificationsSaved, setNotificationsSaved] = useState(false)

  // Email signature state
  const [emailSignature, setEmailSignature] = useState(profile?.email_signature || '')
  const [savingSignature, setSavingSignature] = useState(false)
  const [signatureSaved, setSignatureSaved] = useState(false)

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '', is_shared: false })
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Recruiting regions state
  const [recruitingRegions, setRecruitingRegions] = useState<RecruitingRegion[]>(initialRecruitingRegions)
  const [showRegionModal, setShowRegionModal] = useState(false)
  const [editingRegion, setEditingRegion] = useState<RecruitingRegion | null>(null)
  const [regionForm, setRegionForm] = useState({ name: '', states: [] as string[] })
  const [savingRegion, setSavingRegion] = useState(false)

  // Roster teams state
  const [rosterTeams, setRosterTeams] = useState<RosterTeam[]>(initialRosterTeams)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<RosterTeam | null>(null)
  const [teamForm, setTeamForm] = useState({ name: '', areas: '' })
  const [savingTeam, setSavingTeam] = useState(false)


  // Region assignments state (for handoffs)
  interface RegionAssignmentData {
    id: string
    region: string
    default_agent_id: string | null
    default_marketing_id: string | null
    agent_ids: string[]
    marketing_ids: string[]
    primary_agent_id: string | null
    primary_marketing_id: string | null
  }
  interface StaffUser {
    id: string
    name: string
    role: string
    assigned_regions: string[]
  }
  const [regionAssignments, setRegionAssignments] = useState<RegionAssignmentData[]>([])
  const [availableAgents, setAvailableAgents] = useState<StaffUser[]>([])
  const [availableMarketingUsers, setAvailableMarketingUsers] = useState<StaffUser[]>([])
  const [loadingHandoffs, setLoadingHandoffs] = useState(false)
  const [savingHandoff, setSavingHandoff] = useState<string | null>(null)
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)

  // Organization state
  const [orgName, setOrgName] = useState(organization?.name || '')
  const [isEditingOrgName, setIsEditingOrgName] = useState(false)
  const [isSavingOrg, setIsSavingOrg] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const router = useRouter()
  const supabase = createClient()

  const sidebarGroups = [
    {
      label: 'My Account',
      adminOnly: false,
      items: [
        { id: 'profile' as const, label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { id: 'notifications' as const, label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
        { id: 'signature' as const, label: 'Email Signature', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
        { id: 'templates' as const, label: 'Templates', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      ],
    },
    {
      label: 'Integrations',
      adminOnly: false,
      items: [
        { id: 'integrations' as const, label: 'Integrations', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
      ],
    },
    {
      label: 'Organization',
      adminOnly: true,
      items: [
        { id: 'organization' as const, label: 'Organization', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { id: 'team' as const, label: 'Team', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        { id: 'regions' as const, label: 'Recruiting Regions', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'roster-teams' as const, label: 'Roster Teams', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { id: 'handoffs' as const, label: 'Auto Handoffs', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
        { id: 'goals' as const, label: 'Goals', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      ],
    },
  ]

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700'
      case 'agent': return 'bg-blue-100 text-blue-700'
      case 'scout': return 'bg-green-100 text-green-700'
      case 'marketing': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Notification functions
  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
    setNotificationsSaved(false)
  }

  const saveNotifications = async () => {
    if (!profile?.id) return
    setSavingNotifications(true)
    setNotificationsSaved(false)

    const { error } = await supabase
      .from('users')
      .update({
        notify_follow_ups: notifications.emailFollowUps,
        notify_task_reminders: notifications.emailTaskReminders,
        notify_new_assignments: notifications.emailNewAssignments,
        notify_weekly_summary: notifications.emailWeeklySummary,
      } as never)
      .eq('id', profile.id)

    setSavingNotifications(false)
    if (!error) {
      setNotificationsSaved(true)
      setTimeout(() => setNotificationsSaved(false), 3000)
    }
  }

  // Email signature functions
  const saveSignature = async () => {
    if (!profile?.id) return
    setSavingSignature(true)
    setSignatureSaved(false)

    const { error } = await supabase
      .from('users')
      .update({
        email_signature: emailSignature || null,
      } as never)
      .eq('id', profile.id)

    setSavingSignature(false)
    if (!error) {
      setSignatureSaved(true)
      setTimeout(() => setSignatureSaved(false), 3000)
    }
  }

  // Template functions
  const openNewTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({ name: '', subject: '', body: '', is_shared: false })
    setShowTemplateModal(true)
  }

  const openEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      is_shared: template.is_shared,
    })
    setShowTemplateModal(true)
  }

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) return
    setSavingTemplate(true)

    if (editingTemplate) {
      const { data, error } = await supabase
        .from('email_templates')
        .update({
          name: templateForm.name,
          subject: templateForm.subject,
          body: templateForm.body,
          is_shared: templateForm.is_shared,
        } as never)
        .eq('id', editingTemplate.id)
        .select()
        .single()

      if (!error && data) {
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? data as EmailTemplate : t))
      }
    } else {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          name: templateForm.name,
          subject: templateForm.subject,
          body: templateForm.body,
          is_shared: templateForm.is_shared,
          created_by: profile?.id,
        } as never)
        .select()
        .single()

      if (!error && data) {
        setTemplates(prev => [...prev, data as EmailTemplate])
      }
    }

    setSavingTemplate(false)
    setShowTemplateModal(false)
  }

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)

    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id))
    }
  }

  // Recruiting region functions
  const openNewRegion = () => {
    setEditingRegion(null)
    setRegionForm({ name: '', states: [] })
    setShowRegionModal(true)
  }

  const openEditRegion = (region: RecruitingRegion) => {
    setEditingRegion(region)
    setRegionForm({
      name: region.name,
      states: region.states || [],
    })
    setShowRegionModal(true)
  }

  const toggleRegionState = (state: string) => {
    setRegionForm(prev => ({
      ...prev,
      states: prev.states.includes(state)
        ? prev.states.filter(s => s !== state)
        : [...prev.states, state]
    }))
  }

  const saveRegion = async () => {
    if (!regionForm.name) return
    setSavingRegion(true)

    if (editingRegion) {
      const { data, error } = await supabase
        .from('recruiting_regions')
        .update({
          name: regionForm.name,
          states: regionForm.states,
        } as never)
        .eq('id', editingRegion.id)
        .select()
        .single()

      if (!error && data) {
        setRecruitingRegions(prev => prev.map(r => r.id === editingRegion.id ? data as RecruitingRegion : r))
      }
    } else {
      const { data, error } = await supabase
        .from('recruiting_regions')
        .insert({
          name: regionForm.name,
          states: regionForm.states,
        } as never)
        .select()
        .single()

      if (!error && data) {
        setRecruitingRegions(prev => [...prev, data as RecruitingRegion])
      }
    }

    setSavingRegion(false)
    setShowRegionModal(false)
  }

  const deleteRegion = async (id: string) => {
    const { error } = await supabase
      .from('recruiting_regions')
      .delete()
      .eq('id', id)

    if (!error) {
      setRecruitingRegions(prev => prev.filter(r => r.id !== id))
    }
  }

  // Roster team functions
  const openNewTeam = () => {
    setEditingTeam(null)
    setTeamForm({ name: '', areas: '' })
    setShowTeamModal(true)
  }

  const openEditTeam = (team: RosterTeam) => {
    setEditingTeam(team)
    setTeamForm({
      name: team.name,
      areas: (team.regions || []).join(', '),
    })
    setShowTeamModal(true)
  }

  const saveTeam = async () => {
    if (!teamForm.name) return
    setSavingTeam(true)

    // Parse areas from comma-separated string
    const areasArray = teamForm.areas
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0)

    if (editingTeam) {
      const { data, error } = await supabase
        .from('roster_teams')
        .update({
          name: teamForm.name,
          regions: areasArray,
        } as never)
        .eq('id', editingTeam.id)
        .select()
        .single()

      if (!error && data) {
        setRosterTeams(prev => prev.map(t => t.id === editingTeam.id ? data as RosterTeam : t))
      }
    } else {
      const { data, error } = await supabase
        .from('roster_teams')
        .insert({
          name: teamForm.name,
          regions: areasArray,
        } as never)
        .select()
        .single()

      if (!error && data) {
        setRosterTeams(prev => [...prev, data as RosterTeam])
      }
    }

    setSavingTeam(false)
    setShowTeamModal(false)
  }

  const deleteTeam = async (id: string) => {
    const { error } = await supabase
      .from('roster_teams')
      .delete()
      .eq('id', id)

    if (!error) {
      setRosterTeams(prev => prev.filter(t => t.id !== id))
    }
  }


  // Fetch region assignments for handoffs
  const fetchRegionAssignments = async () => {
    setLoadingHandoffs(true)
    try {
      const response = await fetch('/api/settings/region-assignments')
      const data = await response.json()
      if (data.assignments) {
        setRegionAssignments(data.assignments)
        setAvailableAgents(data.agents || [])
        setAvailableMarketingUsers(data.marketingUsers || [])
      }
    } catch (error) {
      console.error('Failed to fetch region assignments:', error)
    }
    setLoadingHandoffs(false)
  }

  // Load handoffs data when section becomes active
  useEffect(() => {
    if (activeSection === 'handoffs' && regionAssignments.length === 0) {
      fetchRegionAssignments()
    }
  }, [activeSection]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle user in region assignment
  const toggleUserInRegion = async (region: string, userId: string, type: 'agent' | 'marketing') => {
    const current = regionAssignments.find(r => r.region === region)
    if (!current) return

    setSavingHandoff(region)

    const currentIds = type === 'agent' ? (current.agent_ids || []) : (current.marketing_ids || [])
    const isCurrentlyAssigned = currentIds.includes(userId)
    const newIds = isCurrentlyAssigned
      ? currentIds.filter(id => id !== userId)
      : [...currentIds, userId]

    // Update primary if needed
    let newPrimary = type === 'agent' ? current.primary_agent_id : current.primary_marketing_id
    if (isCurrentlyAssigned && newPrimary === userId) {
      newPrimary = newIds[0] || null
    } else if (!isCurrentlyAssigned && newIds.length === 1) {
      newPrimary = userId
    }

    try {
      const response = await fetch('/api/settings/region-assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          agent_ids: type === 'agent' ? newIds : (current.agent_ids || []),
          marketing_ids: type === 'marketing' ? newIds : (current.marketing_ids || []),
          primary_agent_id: type === 'agent' ? newPrimary : current.primary_agent_id,
          primary_marketing_id: type === 'marketing' ? newPrimary : current.primary_marketing_id,
        }),
      })
      const data = await response.json()
      if (data.success && data.assignment) {
        setRegionAssignments(prev => prev.map(r => r.region === region ? data.assignment : r))
      }
    } catch (error) {
      console.error('Failed to save region assignment:', error)
    }
    setSavingHandoff(null)
  }

  // Set primary user for a region
  const setPrimaryUser = async (region: string, userId: string, type: 'agent' | 'marketing') => {
    const current = regionAssignments.find(r => r.region === region)
    if (!current) return

    setSavingHandoff(region)

    try {
      const response = await fetch('/api/settings/region-assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          agent_ids: current.agent_ids || [],
          marketing_ids: current.marketing_ids || [],
          primary_agent_id: type === 'agent' ? userId : current.primary_agent_id,
          primary_marketing_id: type === 'marketing' ? userId : current.primary_marketing_id,
        }),
      })
      const data = await response.json()
      if (data.success && data.assignment) {
        setRegionAssignments(prev => prev.map(r => r.region === region ? data.assignment : r))
      }
    } catch (error) {
      console.error('Failed to save primary assignment:', error)
    }
    setSavingHandoff(null)
  }

  // Organization functions
  const handleSaveOrgName = async () => {
    if (!organization || !orgName.trim()) return
    setIsSavingOrg(true)

    const { error } = await supabase
      .from('organizations')
      .update({ name: orgName.trim() } as never)
      .eq('id', organization.id)

    setIsSavingOrg(false)
    if (!error) {
      setIsEditingOrgName(false)
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-16 md:h-[92px] flex flex-col justify-center px-4 md:px-6 bg-gray-50 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account and team</p>
      </div>

      {/* Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <nav className="p-3 space-y-4">
            {sidebarGroups
              .filter(group => !group.adminOnly || isAdmin)
              .map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeSection === item.id
                            ? 'bg-white text-brand-700 shadow-sm border border-gray-200'
                            : 'text-gray-600 hover:bg-white hover:text-gray-900'
                        }`}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                  <p className="text-sm text-gray-500">Your personal details and role</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start gap-4">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.name || ''}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-xl font-bold text-white">
                        {profile?.name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{profile?.name}</h3>
                      <p className="text-sm text-gray-500">{profile?.email}</p>
                      <span className={`inline-flex mt-2 px-2 py-0.5 text-xs font-medium rounded capitalize ${getRoleBadgeColor(profile?.role || '')}`}>
                        {profile?.role}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Status</p>
                      <p className="mt-1 text-sm text-green-600 font-medium">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                  <p className="text-sm text-gray-500">Manage your email notification preferences</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Follow-up Reminders</p>
                      <p className="text-sm text-gray-500">Get notified when follow-ups are due</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('emailFollowUps')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.emailFollowUps ? 'bg-brand-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications.emailFollowUps ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Task Reminders</p>
                      <p className="text-sm text-gray-500">Get notified about upcoming and overdue tasks</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('emailTaskReminders')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.emailTaskReminders ? 'bg-brand-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications.emailTaskReminders ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">New Assignments</p>
                      <p className="text-sm text-gray-500">Get notified when athletes are assigned to you</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('emailNewAssignments')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.emailNewAssignments ? 'bg-brand-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications.emailNewAssignments ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Weekly Summary</p>
                      <p className="text-sm text-gray-500">Receive a weekly activity digest</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange('emailWeeklySummary')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.emailWeeklySummary ? 'bg-brand-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications.emailWeeklySummary ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={saveNotifications}
                    disabled={savingNotifications}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50"
                  >
                    {savingNotifications ? 'Saving...' : 'Save Preferences'}
                  </button>
                  {notificationsSaved && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Email Signature Section */}
            {activeSection === 'signature' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Email Signature</h2>
                  <p className="text-sm text-gray-500">Your signature will be added to all outgoing emails</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                  <div>
                    <label htmlFor="email-signature" className="block text-sm font-medium text-gray-700 mb-2">
                      Signature HTML
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Paste your signature HTML from WiseStamp or another signature generator. Your logo and formatting will be preserved.
                    </p>
                    <textarea
                      id="email-signature"
                      rows={8}
                      value={emailSignature}
                      onChange={(e) => {
                        setEmailSignature(e.target.value)
                        setSignatureSaved(false)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="Paste your signature HTML here..."
                    />
                  </div>

                  {emailSignature && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div dangerouslySetInnerHTML={{ __html: emailSignature }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={saveSignature}
                    disabled={savingSignature}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50"
                  >
                    {savingSignature ? 'Saving...' : 'Save Signature'}
                  </button>
                  {signatureSaved && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </span>
                  )}
                  {emailSignature && (
                    <button
                      onClick={() => {
                        setEmailSignature('')
                        setSignatureSaved(false)
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Templates Section */}
            {activeSection === 'templates' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
                    <p className="text-sm text-gray-500">Create reusable templates for athlete outreach</p>
                  </div>
                  <button
                    onClick={openNewTemplate}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Template
                  </button>
                </div>

                {templates.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 border-dashed p-8 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-gray-500 mb-4">No templates yet. Create your first email template.</p>
                    <button
                      onClick={openNewTemplate}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-brand-600 border border-brand-600 hover:bg-brand-50 rounded-lg"
                    >
                      Create Template
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                    {templates.map((template) => (
                      <div key={template.id} className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{template.name}</p>
                            {template.is_shared && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Shared</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate max-w-md">{template.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditTemplate(template)}
                            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Pro Tip</p>
                      <p className="text-sm text-blue-700">Use variables like {"{{athlete_name}}"} and {"{{sport}}"} to personalize templates.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Section */}
            {activeSection === 'integrations' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Connectors</h2>
                  <p className="text-sm text-gray-500">Connect apps and services to AthleteDesk</p>
                </div>

                {loadingIntegrations ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading integrations...</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                    {/* Gmail */}
                    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <Image
                          src="https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png"
                          alt="Gmail"
                          width={32}
                          height={32}
                          className="w-8 h-8"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">Gmail</h3>
                        {gmailConnected && gmailEmail && (
                          <p className="text-xs text-gray-500 truncate">{gmailEmail}</p>
                        )}
                      </div>
                      {gmailConnected ? (
                        <span className="text-sm font-medium text-green-600">Connected</span>
                      ) : (
                        <button
                          onClick={() => window.location.href = '/api/gmail/auth'}
                          className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Connect
                        </button>
                      )}
                      <div className="relative" data-dropdown>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'gmail' ? null : 'gmail')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openDropdown === 'gmail' && (
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                            {gmailConnected ? (
                              <button
                                onClick={disconnectGmail}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                              >
                                Disconnect
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  window.location.href = '/api/gmail/auth'
                                  setOpenDropdown(null)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Google Calendar - uses same auth as Gmail */}
                    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <Image
                          src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png"
                          alt="Google Calendar"
                          width={32}
                          height={32}
                          className="w-8 h-8"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">Google Calendar</h3>
                        {(isIntegrationConnected('google_calendar') || gmailConnected) && (gmailEmail || getIntegration('google_calendar')?.account_email) && (
                          <p className="text-xs text-gray-500 truncate">{gmailEmail || getIntegration('google_calendar')?.account_email}</p>
                        )}
                      </div>
                      {(isIntegrationConnected('google_calendar') || gmailConnected) ? (
                        <span className="text-sm font-medium text-green-600">Connected</span>
                      ) : (
                        <button
                          onClick={() => window.location.href = '/api/gmail/auth'}
                          className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Connect
                        </button>
                      )}
                      <div className="relative" data-dropdown>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'google_calendar' ? null : 'google_calendar')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openDropdown === 'google_calendar' && (
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                            {(isIntegrationConnected('google_calendar') || gmailConnected) ? (
                              <button
                                onClick={() => disconnectIntegration('google_calendar')}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                              >
                                Disconnect
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  window.location.href = '/api/gmail/auth'
                                  setOpenDropdown(null)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Calendly */}
                    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8" viewBox="0 0 120 120">
                          <circle fill="#006BFF" cx="60" cy="60" r="60"/>
                          <path fill="#fff" d="M60 25c-19.33 0-35 15.67-35 35s15.67 35 35 35c9.27 0 17.71-3.61 24-9.5l-8.5-8.5c-4.12 3.85-9.64 6.2-15.5 6.2-12.7 0-23-10.3-23-23s10.3-23 23-23c6.35 0 12.1 2.58 16.26 6.74L84 35.5C77.71 28.61 69.27 25 60 25z"/>
                          <path fill="#fff" d="M85 55h-25v10h25z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">Calendly</h3>
                        {isIntegrationConnected('calendly') && getIntegration('calendly')?.account_name && (
                          <p className="text-xs text-gray-500 truncate">{getIntegration('calendly')?.account_name}</p>
                        )}
                      </div>
                      {isIntegrationConnected('calendly') ? (
                        <span className="text-sm font-medium text-green-600">Connected</span>
                      ) : (
                        <button
                          onClick={() => window.location.href = '/api/integrations/calendly'}
                          className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Connect
                        </button>
                      )}
                      <div className="relative" data-dropdown>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'calendly' ? null : 'calendly')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openDropdown === 'calendly' && (
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                            {isIntegrationConnected('calendly') ? (
                              <button
                                onClick={() => disconnectIntegration('calendly')}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                              >
                                Disconnect
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  window.location.href = '/api/integrations/calendly'
                                  setOpenDropdown(null)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DocuSign */}
                    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8" viewBox="0 0 40 40">
                          <rect fill="#FFC829" width="40" height="40" rx="4"/>
                          <path fill="#1A1A1A" d="M10 12h20v2H10zM10 18h20v2H10zM10 24h14v2H10z"/>
                          <path fill="#1A1A1A" d="M28 20c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm2.5 5l-3.5 3.5-1.5-1.5 1-1 .5.5 2.5-2.5 1 1z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">DocuSign</h3>
                        {isIntegrationConnected('docusign') && getIntegration('docusign')?.account_email && (
                          <p className="text-xs text-gray-500 truncate">{getIntegration('docusign')?.account_email}</p>
                        )}
                      </div>
                      {isIntegrationConnected('docusign') ? (
                        <span className="text-sm font-medium text-green-600">Connected</span>
                      ) : (
                        <button
                          onClick={() => window.location.href = '/api/integrations/docusign'}
                          className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Connect
                        </button>
                      )}
                      <div className="relative" data-dropdown>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'docusign' ? null : 'docusign')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openDropdown === 'docusign' && (
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                            {isIntegrationConnected('docusign') ? (
                              <button
                                onClick={() => disconnectIntegration('docusign')}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                              >
                                Disconnect
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  window.location.href = '/api/integrations/docusign'
                                  setOpenDropdown(null)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Apollo */}
                    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8" viewBox="0 0 40 40">
                          <rect fill="#6C5CE7" width="40" height="40" rx="8"/>
                          <path fill="#fff" d="M20 8l-10 20h6l4-8 4 8h6L20 8zm0 6l3 6h-6l3-6z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">Apollo.io</h3>
                        {isIntegrationConnected('apollo') && (
                          <p className="text-xs text-gray-500">API Key configured</p>
                        )}
                      </div>
                      {isIntegrationConnected('apollo') ? (
                        <span className="text-sm font-medium text-green-600">Connected</span>
                      ) : (
                        <button
                          onClick={() => setShowApolloModal(true)}
                          className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Connect
                        </button>
                      )}
                      <div className="relative" data-dropdown>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'apollo' ? null : 'apollo')}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openDropdown === 'apollo' && (
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                            {isIntegrationConnected('apollo') ? (
                              <button
                                onClick={() => disconnectIntegration('apollo')}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                              >
                                Disconnect
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setShowApolloModal(true)
                                  setOpenDropdown(null)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team Section */}
            {activeSection === 'team' && isAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Team Management</h2>
                    <p className="text-sm text-gray-500">Invite members and manage roles</p>
                  </div>
                  <Link
                    href="/settings/team"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Manage Team
                  </Link>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Role Permissions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 w-20 text-center">Admin</span>
                      <span className="text-sm text-gray-600">Full access, team management, settings</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 w-20 text-center">Agent</span>
                      <span className="text-sm text-gray-600">Manage athletes, deals, contracts</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 w-20 text-center">Scout</span>
                      <span className="text-sm text-gray-600">Add athletes, recruiting pipeline</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-700 w-20 text-center">Marketing</span>
                      <span className="text-sm text-gray-600">Brand outreach, communications</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 w-20 text-center">Intern</span>
                      <span className="text-sm text-gray-600">View-only access</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Goals Section */}
            {activeSection === 'goals' && isAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Outreach Goals</h2>
                    <p className="text-sm text-gray-500">Set communication targets for your team</p>
                  </div>
                  <Link
                    href="/settings/outreach-goals"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Manage Goals
                  </Link>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">About Outreach Goals</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Set weekly or monthly targets for emails, calls, or total communications</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Assign goals to specific staff members or entire roles</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Track progress on the Dashboard and Productivity pages</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recruiting Regions Section */}
            {activeSection === 'regions' && isAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Recruiting Regions</h2>
                    <p className="text-sm text-gray-500">Define geographic regions and assign states for recruiting</p>
                  </div>
                  <button
                    onClick={openNewRegion}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Region
                  </button>
                </div>

                {recruitingRegions.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 border-dashed p-8 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-500 mb-4">No recruiting regions yet. Create your first region.</p>
                    <button
                      onClick={openNewRegion}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-brand-600 border border-brand-600 hover:bg-brand-50 rounded-lg"
                    >
                      Create Region
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recruitingRegions.map((region) => (
                      <div key={region.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </span>
                            <h3 className="text-sm font-semibold text-gray-900">{region.name}</h3>
                            <span className="text-xs text-gray-500">{(region.states || []).length} states</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditRegion(region)}
                              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteRegion(region.id)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(region.states || []).map((state) => (
                            <span key={state} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {state}
                            </span>
                          ))}
                          {(!region.states || region.states.length === 0) && (
                            <span className="text-xs text-gray-400">No states assigned</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Recruiting Regions</p>
                      <p className="text-sm text-blue-700">Use regions to organize your recruiting efforts. Assign staff to regions from the Team Management page.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Roster Teams Section */}
            {activeSection === 'roster-teams' && isAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Roster Teams</h2>
                    <p className="text-sm text-gray-500">Organize signed athletes by team based on school location</p>
                  </div>
                  <button
                    onClick={openNewTeam}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Team
                  </button>
                </div>

                {rosterTeams.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 border-dashed p-8 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-sm text-gray-500 mb-4">No roster teams yet. Create your first team.</p>
                    <button
                      onClick={openNewTeam}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-brand-600 border border-brand-600 hover:bg-brand-50 rounded-lg"
                    >
                      Create Team
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rosterTeams.map((team) => (
                      <div key={team.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-900">{team.name}</h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditTeam(team)}
                              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteTeam(team.id)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(team.regions || []).map((area) => (
                            <span key={area} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {area}
                            </span>
                          ))}
                          {(!team.regions || team.regions.length === 0) && (
                            <span className="text-xs text-gray-400">No areas assigned</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Roster Teams</p>
                      <p className="text-sm text-amber-700">Roster teams organize signed athletes by school location. Enter states or areas (e.g., &quot;California, Oregon&quot; or &quot;DMV, Northeast&quot;).</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Auto Handoffs Section */}
            {activeSection === 'handoffs' && isAdmin && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Automated Handoffs</h2>
                  <p className="text-sm text-gray-500">Configure automatic assignment of athletes when their status changes</p>
                </div>

                {/* How it works */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">How it works</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-green-700">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Scout → Agent</p>
                        <p className="text-sm text-gray-500">When a scout marks an athlete as &quot;Interested&quot; or &quot;In Conversation&quot;, the athlete is automatically assigned to the default agent for that region.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-700">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Agent → Marketing</p>
                        <p className="text-sm text-gray-500">When an agent marks an athlete as &quot;Signed&quot;, they are automatically assigned to the default marketing lead for that region.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Auto-created Tasks</p>
                        <p className="text-sm text-gray-500">A high-priority task is automatically created for the newly assigned user with a 3-day due date.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Region Assignments */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Assignments by Region</h3>
                  <p className="text-xs text-gray-500 mb-3">Click a region to assign multiple agents and marketing users. The primary user (starred) receives auto-handoffs.</p>
                  {loadingHandoffs ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {regionAssignments.map((assignment) => {
                        const isExpanded = expandedRegion === assignment.region
                        const agentCount = (assignment.agent_ids || []).length
                        const marketingCount = (assignment.marketing_ids || []).length

                        return (
                          <div key={assignment.region} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* Region Header - Click to expand */}
                            <button
                              onClick={() => setExpandedRegion(isExpanded ? null : assignment.region)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-sm font-medium text-gray-900">{assignment.region}</span>
                                {savingHandoff === assignment.region && (
                                  <span className="text-xs text-brand-600">Saving...</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
                                <span>{marketingCount} marketing</span>
                              </div>
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 px-4 py-4 bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Agents */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Agents</h4>
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {availableAgents.map((agent) => {
                                        const isAssigned = (assignment.agent_ids || []).includes(agent.id)
                                        const isPrimary = assignment.primary_agent_id === agent.id
                                        return (
                                          <div key={agent.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white">
                                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                              <input
                                                type="checkbox"
                                                checked={isAssigned}
                                                onChange={() => toggleUserInRegion(assignment.region, agent.id, 'agent')}
                                                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                                              />
                                              <span className="text-sm text-gray-700">{agent.name}</span>
                                              <span className="text-xs text-gray-400">({agent.role})</span>
                                            </label>
                                            {isAssigned && (
                                              <button
                                                onClick={() => setPrimaryUser(assignment.region, agent.id, 'agent')}
                                                className={`p-1 rounded ${isPrimary ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                                                title={isPrimary ? 'Primary (receives handoffs)' : 'Set as primary'}
                                              >
                                                <svg className="w-4 h-4" fill={isPrimary ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                        )
                                      })}
                                      {availableAgents.length === 0 && (
                                        <p className="text-xs text-gray-400 py-2">No agents available</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Marketing */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Marketing</h4>
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {availableMarketingUsers.map((user) => {
                                        const isAssigned = (assignment.marketing_ids || []).includes(user.id)
                                        const isPrimary = assignment.primary_marketing_id === user.id
                                        return (
                                          <div key={user.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white">
                                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                              <input
                                                type="checkbox"
                                                checked={isAssigned}
                                                onChange={() => toggleUserInRegion(assignment.region, user.id, 'marketing')}
                                                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                                              />
                                              <span className="text-sm text-gray-700">{user.name}</span>
                                              <span className="text-xs text-gray-400">({user.role})</span>
                                            </label>
                                            {isAssigned && (
                                              <button
                                                onClick={() => setPrimaryUser(assignment.region, user.id, 'marketing')}
                                                className={`p-1 rounded ${isPrimary ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                                                title={isPrimary ? 'Primary (receives handoffs)' : 'Set as primary'}
                                              >
                                                <svg className="w-4 h-4" fill={isPrimary ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                        )
                                      })}
                                      {availableMarketingUsers.length === 0 && (
                                        <p className="text-xs text-gray-400 py-2">No marketing users available</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Legacy table removed - now using expandable cards above */}
                <div className="hidden">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Region</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Default Agent</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Default Marketing</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {regionAssignments.map((assignment) => (
                            <tr key={assignment.region + '-legacy'}>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-gray-900">{assignment.region}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-500">See above</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-500">See above</span>
                              </td>
                            </tr>
                          ))}
                          {regionAssignments.length === 0 && (
                            <tr><td colSpan={3}><span className="text-sm text-gray-500">Loading...</span></td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                </div>

                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Important</p>
                      <p className="text-sm text-blue-700">Handoffs only trigger when the athlete has a region set and hasn&apos;t already been assigned. Manual assignments take priority over automatic ones.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Organization Section */}
            {activeSection === 'organization' && isAdmin && organization && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Organization Settings</h2>
                  <p className="text-sm text-gray-500">Manage your organization details</p>
                </div>

                {/* Organization Details */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Organization Name
                      </label>
                      {isEditingOrgName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="Organization name"
                          />
                          <button
                            onClick={handleSaveOrgName}
                            disabled={isSavingOrg || !orgName.trim()}
                            className="px-3 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50"
                          >
                            {isSavingOrg ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingOrgName(false)
                              setOrgName(organization.name)
                            }}
                            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">{organization.name}</span>
                          {isOwner && (
                            <button
                              onClick={() => setIsEditingOrgName(true)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Organization ID
                        </label>
                        <span className="text-sm text-gray-500 font-mono">{organization.slug}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Created
                        </label>
                        <span className="text-sm text-gray-500">
                          {new Date(organization.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Team Members</p>
                      <p className="text-sm text-blue-700">To manage team members, roles, and invitations, go to the <Link href="/settings/team" className="underline font-medium">Team Management</Link> page.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Initial Outreach"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Opportunity for {{athlete_name}}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Write your template content here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_shared"
                  checked={templateForm.is_shared}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, is_shared: e.target.checked }))}
                  className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="is_shared" className="text-sm text-gray-700">
                  Share with team (visible to all staff members)
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={savingTemplate || !templateForm.name || !templateForm.subject || !templateForm.body}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50"
              >
                {savingTemplate ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recruiting Region Modal */}
      {showRegionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRegion ? 'Edit Region' : 'New Region'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region Name</label>
                <input
                  type="text"
                  value={regionForm.name}
                  onChange={(e) => setRegionForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Northwest"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  States ({regionForm.states.length} selected)
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-2">
                  {US_STATES.map((state) => (
                    <label key={state} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={regionForm.states.includes(state)}
                        onChange={() => toggleRegionState(state)}
                        className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">{state}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowRegionModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveRegion}
                disabled={savingRegion || !regionForm.name}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50"
              >
                {savingRegion ? 'Saving...' : editingRegion ? 'Save Changes' : 'Create Region'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTeam ? 'Edit Team' : 'New Team'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., West Coast"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">States / Areas</label>
                <input
                  type="text"
                  value={teamForm.areas}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, areas: e.target.value }))}
                  placeholder="e.g., California, Oregon, Kansas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <p className="mt-1 text-xs text-gray-500">Enter states or areas separated by commas (e.g., &quot;California, Oregon&quot; or &quot;DMV, Midwest&quot;)</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowTeamModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveTeam}
                disabled={savingTeam || !teamForm.name}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50"
              >
                {savingTeam ? 'Saving...' : editingTeam ? 'Save Changes' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apollo API Key Modal */}
      {showApolloModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8" viewBox="0 0 40 40">
                  <rect fill="#6C5CE7" width="40" height="40" rx="8"/>
                  <path fill="#fff" d="M20 8l-10 20h6l4-8 4 8h6L20 8zm0 6l3 6h-6l3-6z"/>
                </svg>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Connect Apollo.io</h2>
                  <p className="text-sm text-gray-500">Enter your Apollo API key</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={apolloApiKey}
                  onChange={(e) => setApolloApiKey(e.target.value)}
                  placeholder="Enter your Apollo API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              {apolloError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">
                  {apolloError}
                </div>
              )}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Where to find your API key:</strong>
                </p>
                <ol className="text-sm text-blue-700 mt-1 list-decimal list-inside space-y-1">
                  <li>Go to <a href="https://app.apollo.io" target="_blank" rel="noopener noreferrer" className="underline">app.apollo.io</a></li>
                  <li>Click Settings → Integrations → API Keys</li>
                  <li>Create or copy your API key</li>
                </ol>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApolloModal(false)
                  setApolloApiKey('')
                  setApolloError('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveApolloApiKey}
                disabled={savingApollo || !apolloApiKey.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50"
              >
                {savingApollo ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
