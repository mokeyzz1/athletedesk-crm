'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Stats {
  totalOrganizations: number
  totalUsers: number
  totalAthletes: number
  pendingInvites: number
  usedInvites: number
}

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  settings: { agency_type?: string; sports_focus?: string[] }
  created_at: string
  owner: { id: string; name: string; email: string } | null
  userCount: number
  athleteCount: number
}

interface Invite {
  id: string
  token: string
  email: string | null
  invite_type: 'new_org' | 'join_org'
  expires_at: string
  accepted_at: string | null
  created_at: string
  organization: { id: string; name: string } | null
  created_by_user: { id: string; name: string } | null
  accepted_by_user: { id: string; name: string; email: string } | null
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'invites'>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [invites, setInvites] = useState<Invite[]>([])

  // Create invite form
  const [showCreateInvite, setShowCreateInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteType, setInviteType] = useState<'new_org' | 'join_org'>('new_org')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [sendEmailInvite, setSendEmailInvite] = useState(true)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [newInviteUrl, setNewInviteUrl] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, orgsRes, invitesRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/organizations'),
        fetch('/api/admin/invites'),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json()
        setOrganizations(orgsData.organizations || [])
      }
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json()
        setInvites(invitesData.invites || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/check')
      if (!response.ok) {
        router.push('/dashboard')
        return
      }
      loadData()
    } catch {
      router.push('/dashboard')
    }
  }, [router, loadData])

  useEffect(() => {
    checkAdminAccess()
  }, [checkAdminAccess])

  const createInvite = async () => {
    setCreatingInvite(true)
    setNewInviteUrl('')
    setEmailSent(false)
    setEmailError(null)
    setCopied(false)
    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail || null,
          inviteType,
          organizationId: inviteType === 'join_org' ? selectedOrgId : null,
          sendEmailInvite: sendEmailInvite && !!inviteEmail,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewInviteUrl(data.inviteUrl)
        setEmailSent(data.emailSent)
        setEmailError(data.emailError)
        setInviteEmail('')
        loadData()
      }
    } finally {
      setCreatingInvite(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const viewOrganization = async (orgId: string) => {
    // Set impersonation via API and wait for confirmation
    const response = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: orgId }),
    })

    const result = await response.json()

    if (result.success) {
      // Force a hard navigation to ensure fresh data
      window.location.href = '/dashboard'
    } else {
      console.error('Failed to set impersonation:', result.error)
    }
  }

  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const deleteOrganization = async (orgId: string, orgName: string) => {
    if (confirmDelete !== orgId) {
      setConfirmDelete(orgId)
      return
    }

    setDeletingOrgId(orgId)
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh data
        loadData()
        setConfirmDelete(null)
      } else {
        const result = await response.json()
        alert(`Failed to delete: ${result.error}`)
      }
    } catch (err) {
      alert('Failed to delete organization')
    } finally {
      setDeletingOrgId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    )},
    { id: 'organizations', label: 'Organizations', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    )},
    { id: 'invites', label: 'Invites', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    )},
  ]

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-60 bg-brand-900 flex flex-col">
        {/* Workspace Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-brand-700 bg-brand-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-brand-600 font-bold text-sm">AD</span>
            </div>
            <span className="text-white font-semibold text-lg">AthleteDesk</span>
            <span className="bg-brand-800 text-brand-200 text-[10px] font-medium px-1.5 py-0.5 rounded">ADMIN</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-brand-800 text-white'
                  : 'text-brand-100 hover:bg-brand-800 hover:text-white'
              }`}
            >
              <span className={activeTab === item.id ? 'text-white' : 'text-brand-300'}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Back to Dashboard */}
        <div className="px-2 py-3 border-t border-brand-700">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-brand-100 hover:bg-brand-800 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Back to CRM
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-12 border-b border-gray-200 flex items-center px-6">
          <h1 className="text-lg font-semibold text-gray-900 capitalize">{activeTab}</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6 max-w-5xl">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Organizations', value: stats.totalOrganizations },
                  { label: 'Users', value: stats.totalUsers },
                  { label: 'Athletes', value: stats.totalAthletes },
                  { label: 'Pending', value: stats.pendingInvites },
                  { label: 'Accepted', value: stats.usedInvites },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('invites')
                      setShowCreateInvite(true)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    New Invite
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Organizations Tab */}
          {activeTab === 'organizations' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-5xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Organization</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Owner</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Users</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Athletes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white">{org.name.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{org.name}</div>
                            <div className="text-xs text-gray-500">{org.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {org.owner ? (
                          <div>
                            <div className="text-sm text-gray-900">{org.owner.name}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[180px]">{org.owner.email}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-900">{org.userCount}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-900">{org.athleteCount}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => viewOrganization(org.id)}
                            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteOrganization(org.id, org.name)}
                            disabled={deletingOrgId === org.id}
                            className={`text-sm font-medium ${
                              confirmDelete === org.id
                                ? 'text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded'
                                : 'text-red-600 hover:text-red-700'
                            } disabled:opacity-50`}
                          >
                            {deletingOrgId === org.id ? 'Deleting...' : confirmDelete === org.id ? 'Confirm?' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {organizations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        No organizations yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Invites Tab */}
          {activeTab === 'invites' && (
            <div className="space-y-4 max-w-5xl">
              {/* Create Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateInvite(!showCreateInvite)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Invite
                </button>
              </div>

              {/* Create Invite Form */}
              {showCreateInvite && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Create Invite</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={inviteType}
                        onChange={(e) => setInviteType(e.target.value as 'new_org' | 'join_org')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      >
                        <option value="new_org">New Organization</option>
                        <option value="join_org">Join Existing</option>
                      </select>
                    </div>

                    {inviteType === 'join_org' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                        <select
                          value={selectedOrgId}
                          onChange={(e) => setSelectedOrgId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        >
                          <option value="">Select...</option>
                          {organizations.map((org) => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={inviteType === 'new_org' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="anyone@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {inviteEmail && (
                    <div className="mt-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sendEmailInvite}
                          onChange={(e) => setSendEmailInvite(e.target.checked)}
                          className="h-4 w-4 text-brand-600 focus:ring-brand-500 rounded"
                        />
                        <span className="text-sm text-gray-700">Send email invitation</span>
                      </label>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={createInvite}
                      disabled={creatingInvite || (inviteType === 'join_org' && !selectedOrgId)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {creatingInvite ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => setShowCreateInvite(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>

                  {newInviteUrl && (
                    <div className="mt-4 p-3 bg-brand-50 border border-brand-200 rounded-md">
                      <p className="text-sm font-medium text-brand-700 mb-2">Invite created!</p>

                      {emailSent && (
                        <p className="text-sm text-green-600 mb-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Email sent successfully
                        </p>
                      )}

                      {emailError && (
                        <p className="text-sm text-amber-600 mb-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Email failed: {emailError}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newInviteUrl}
                          readOnly
                          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(newInviteUrl)}
                          className={`px-3 py-1.5 rounded text-sm font-medium ${
                            copied ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Invites Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invite</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">For</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invites.map((invite) => {
                      const isExpired = new Date(invite.expires_at) < new Date()
                      const isUsed = !!invite.accepted_at

                      return (
                        <tr key={invite.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{invite.email || 'General invite'}</div>
                            <div className="text-xs text-gray-500">{invite.invite_type === 'new_org' ? 'New org' : 'Join org'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {invite.organization?.name || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {isUsed ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Used
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(invite.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isUsed && !isExpired && (
                              <button
                                onClick={() => copyToClipboard(`${window.location.origin}/invite/${invite.token}`)}
                                className="text-sm text-brand-600 hover:underline"
                              >
                                Copy link
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {invites.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                          No invites yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
