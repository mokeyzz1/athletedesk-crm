'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User, EmailTemplate, RosterTeam, RecruitingRegion } from '@/lib/database.types'
import { US_STATES } from '@/lib/database.types'
import { GmailSettings } from './gmail-settings'

interface SettingsClientProps {
  profile: User | null
  initialTemplates: EmailTemplate[]
  initialRosterTeams: RosterTeam[]
  initialRecruitingRegions: RecruitingRegion[]
}

type SettingsSection = 'profile' | 'notifications' | 'templates' | 'integrations' | 'team' | 'goals' | 'regions' | 'roster-teams'

export function SettingsClient({ profile, initialTemplates, initialRosterTeams, initialRecruitingRegions }: SettingsClientProps) {
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  // Switch to integrations tab if gmail param is present (after OAuth callback)
  useEffect(() => {
    const gmailParam = searchParams.get('gmail')
    if (gmailParam) {
      setActiveSection('integrations')
    }
  }, [searchParams])

  // Notification state - initialized from profile
  const [notifications, setNotifications] = useState({
    emailFollowUps: profile?.notify_follow_ups ?? true,
    emailTaskReminders: profile?.notify_task_reminders ?? true,
    emailWeeklySummary: profile?.notify_weekly_summary ?? false,
    emailNewAssignments: profile?.notify_new_assignments ?? true,
  })
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [notificationsSaved, setNotificationsSaved] = useState(false)

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

  // Cleanup state
  const [cleaningUp, setCleaningUp] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number; remaining: number } | null>(null)

  const isAdmin = profile?.role === 'admin'
  const router = useRouter()
  const supabase = createClient()

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', adminOnly: false },
    { id: 'notifications' as const, label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', adminOnly: false },
    { id: 'templates' as const, label: 'Templates', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', adminOnly: false },
    { id: 'integrations' as const, label: 'Integrations', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', adminOnly: false },
    { id: 'team' as const, label: 'Team', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', adminOnly: true },
    { id: 'goals' as const, label: 'Goals', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', adminOnly: true },
    { id: 'regions' as const, label: 'Recruiting Regions', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', adminOnly: true },
    { id: 'roster-teams' as const, label: 'Roster Teams', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', adminOnly: true },
  ]

  const generalSections = sections.filter(s => !s.adminOnly)
  const adminSections = sections.filter(s => s.adminOnly)

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

  // Cleanup bad imports
  const runCleanup = async () => {
    setCleaningUp(true)
    setCleanupResult(null)
    try {
      const response = await fetch('/api/cleanup-imports', { method: 'DELETE' })
      const data = await response.json()
      if (data.deleted !== undefined) {
        setCleanupResult({ deleted: data.deleted, remaining: data.remaining })
        router.refresh()
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
    }
    setCleaningUp(false)
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
          <nav className="p-3 space-y-1">
            {generalSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeSection === section.id
                    ? 'bg-white text-brand-700 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                </svg>
                <span className="truncate">{section.label}</span>
              </button>
            ))}
          </nav>

          {isAdmin && (
            <>
              <div className="px-6 pt-4 pb-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Admin</p>
              </div>
              <nav className="px-3 pb-3 space-y-1">
                {adminSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-white text-brand-700 shadow-sm border border-gray-200'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                    </svg>
                    <span className="truncate">{section.label}</span>
                  </button>
                ))}
              </nav>
            </>
          )}
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
                      <img
                        src={profile.avatar_url}
                        alt={profile.name}
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
                  <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
                  <p className="text-sm text-gray-500">Connect external services to AthleteDesk</p>
                </div>

                <GmailSettings />

                <div className="bg-white rounded-lg border border-gray-200 border-dashed p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">More integrations coming soon</h3>
                      <p className="text-sm text-gray-500">Slack, Calendly, and more</p>
                    </div>
                  </div>
                </div>

                {/* Data Cleanup Section */}
                {isAdmin && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Data Cleanup</h3>
                        <p className="text-sm text-gray-500">Remove athletes with invalid region data (city names instead of regions)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={runCleanup}
                        disabled={cleaningUp}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                      >
                        {cleaningUp ? 'Cleaning...' : 'Run Cleanup'}
                      </button>
                      {cleanupResult && (
                        <span className="text-sm text-gray-600">
                          Deleted {cleanupResult.deleted} athletes. {cleanupResult.remaining} remaining.
                        </span>
                      )}
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
    </div>
  )
}
