'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowUturnLeftIcon,
  BuildingOffice2Icon,
  ChevronRightIcon,
  EnvelopeIcon,
  InboxArrowDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { AccessRequestStatus } from '@/lib/access-requests'

type AdminTab = 'overview' | 'organizations' | 'invites' | 'requests'
type RequestFilter = 'all' | AccessRequestStatus

const NAV_ITEMS: Array<{
  id: AdminTab
  label: string
  icon: typeof Squares2X2Icon
}> = [
  { id: 'overview', label: 'Overview', icon: Squares2X2Icon },
  { id: 'organizations', label: 'Organizations', icon: BuildingOffice2Icon },
  { id: 'invites', label: 'Invites', icon: EnvelopeIcon },
  { id: 'requests', label: 'Access Requests', icon: InboxArrowDownIcon },
]

const TAB_META: Record<AdminTab, { title: string; description: string }> = {
  overview: {
    title: 'Platform overview',
    description: 'Monitor agencies, adoption, and onboarding activity.',
  },
  organizations: {
    title: 'Organizations',
    description: 'Manage agency workspaces and enter their CRM.',
  },
  invites: {
    title: 'Invites',
    description: 'Create and track organization and team invitations.',
  },
  requests: {
    title: 'Access requests',
    description: 'Review inbound agencies and move qualified leads into onboarding.',
  },
}

const REQUEST_STATUS_STYLES: Record<AccessRequestStatus, string> = {
  new: 'border-sky-200 bg-sky-50 text-sky-700',
  contacted: 'border-amber-200 bg-amber-50 text-amber-700',
  closed: 'border-neutral-200 bg-neutral-100 text-neutral-600',
}

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

interface AccessRequest {
  id: string
  created_at: string
  name: string
  agency: string
  email: string
  roster_size: string | null
  message: string | null
  status: AccessRequestStatus
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)
  const [requestUpdateError, setRequestUpdateError] = useState<string | null>(null)
  const [requestSearch, setRequestSearch] = useState('')
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

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
      const [statsRes, orgsRes, invitesRes, requestsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/organizations'),
        fetch('/api/admin/invites'),
        fetch('/api/admin/access-requests'),
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
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json()
        setAccessRequests(requestsData.requests || [])
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
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteOrganization = async (orgId: string, orgName: string) => {
    if (confirmDelete !== orgId) {
      setConfirmDelete(orgId)
      return
    }

    setDeleteError(null)
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
        console.error('Failed to delete organization:', result.error)
        setDeleteError(`Could not delete organization. ${result.error || 'Please try again.'}`)
      }
    } catch (err) {
      console.error('Failed to delete organization:', err)
      setDeleteError('Could not delete organization. Please try again.')
    } finally {
      setDeletingOrgId(null)
    }
  }

  const deleteInvite = async (inviteId: string) => {
    setDeleteError(null)
    setDeletingInviteId(inviteId)
    try {
      const response = await fetch(`/api/admin/invites/${inviteId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        loadData()
      } else {
        const result = await response.json()
        console.error('Failed to delete invite:', result.error)
        setDeleteError(`Could not delete invite. ${result.error || 'Please try again.'}`)
      }
    } catch (err) {
      console.error('Failed to delete invite:', err)
      setDeleteError('Could not delete invite. Please try again.')
    } finally {
      setDeletingInviteId(null)
    }
  }

  const updateAccessRequestStatus = async (id: string, status: AccessRequestStatus) => {
    setUpdatingRequestId(id)
    setRequestUpdateError(null)

    try {
      const response = await fetch('/api/admin/access-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update access request')
      }

      setAccessRequests(requests =>
        requests.map(request => request.id === id ? { ...request, status } : request)
      )
    } catch (error) {
      setRequestUpdateError(
        error instanceof Error ? error.message : 'Failed to update access request'
      )
    } finally {
      setUpdatingRequestId(null)
    }
  }

  const startInviteForRequest = (request: AccessRequest) => {
    setInviteEmail(request.email)
    setInviteType('new_org')
    setShowCreateInvite(true)
    setActiveTab('invites')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  const requestCounts: Record<RequestFilter, number> = {
    all: accessRequests.length,
    new: accessRequests.filter(request => request.status === 'new').length,
    contacted: accessRequests.filter(request => request.status === 'contacted').length,
    closed: accessRequests.filter(request => request.status === 'closed').length,
  }
  const normalizedRequestSearch = requestSearch.trim().toLowerCase()
  const filteredRequests = accessRequests.filter(request => {
    const matchesFilter = requestFilter === 'all' || request.status === requestFilter
    const matchesSearch = !normalizedRequestSearch || [
      request.name,
      request.agency,
      request.email,
      request.roster_size || '',
    ].some(value => value.toLowerCase().includes(normalizedRequestSearch))
    return matchesFilter && matchesSearch
  })
  const selectedRequest = filteredRequests.find(request => request.id === selectedRequestId)
    || filteredRequests[0]
    || null
  const activeMeta = TAB_META[activeTab]

  return (
    <div className="flex h-screen bg-[#f7f8fa] text-neutral-900">
      <aside className="hidden w-64 flex-col border-r border-white/10 bg-neutral-950 md:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-sm font-black text-white">
            AD
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">AthleteDesk</p>
            <p className="text-xs font-medium text-neutral-500">Control center</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-600">
            Platform
          </p>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const badge = item.id === 'requests' ? requestCounts.new : 0
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-100'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-brand-400' : 'text-neutral-500'}`} />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-5 rounded-full bg-brand-500 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Production workspace
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowUturnLeftIcon className="h-5 w-5" />
            Back to CRM
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-neutral-200 bg-white">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-neutral-950 text-xs font-black text-white md:hidden">
                AD
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-neutral-950">{activeMeta.title}</h1>
                <p className="hidden truncate text-sm text-neutral-500 sm:block">{activeMeta.description}</p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {activeTab !== 'invites' && (
                <button
                  onClick={() => {
                    setActiveTab('invites')
                    setShowCreateInvite(true)
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-neutral-950 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-neutral-800"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">New invite</span>
                </button>
              )}
              <Link
                href="/dashboard"
                aria-label="Back to CRM"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 md:hidden"
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-t border-neutral-100 px-3 py-2 md:hidden">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex flex-shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                    activeTab === item.id
                      ? 'bg-neutral-950 text-white'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.id === 'requests' && requestCounts.new > 0 && (
                    <span className="rounded-full bg-brand-500 px-1.5 text-[10px] text-white">{requestCounts.new}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Error Banner */}
          {deleteError && (
            <div className="mx-auto mb-4 flex max-w-7xl items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <span className="text-sm">{deleteError}</span>
              <button
                onClick={() => setDeleteError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="mx-auto max-w-7xl space-y-7">
              <div className="grid grid-cols-2 gap-x-8 gap-y-7 py-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-10">
                {[
                  { label: 'Organizations', value: stats.totalOrganizations },
                  { label: 'Team members', value: stats.totalUsers },
                  { label: 'Athletes managed', value: stats.totalAthletes },
                  { label: 'New requests', value: requestCounts.new, accent: requestCounts.new > 0 },
                  { label: 'Pending invites', value: stats.pendingInvites },
                ].map(stat => (
                  <div key={stat.label} className="min-w-0">
                    <p className={`text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl ${
                      stat.accent ? 'text-brand-600' : 'text-neutral-950'
                    }`}>
                      {stat.value}
                    </p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-8 border-t border-neutral-300 pt-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                <section>
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                    <div>
                      <h2 className="text-sm font-bold text-neutral-950">Recent access requests</h2>
                      <p className="mt-0.5 text-xs text-neutral-500">Newest agencies entering the funnel</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700"
                    >
                      View inbox <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-neutral-200 border-b border-neutral-200">
                    {accessRequests.slice(0, 5).map(request => (
                      <button
                        key={request.id}
                        onClick={() => {
                          setSelectedRequestId(request.id)
                          setActiveTab('requests')
                        }}
                        className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-white/60"
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-neutral-950 text-xs font-bold text-white">
                          {request.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-neutral-900">{request.agency}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${REQUEST_STATUS_STYLES[request.status]}`}>
                              {request.status}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-neutral-500">{request.name} · {request.email}</p>
                        </div>
                        <p className="hidden flex-shrink-0 text-xs text-neutral-400 sm:block">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                    {accessRequests.length === 0 && (
                      <div className="py-12 text-center text-sm text-neutral-500">No access requests yet</div>
                    )}
                  </div>
                </section>

                <section className="xl:border-l xl:border-neutral-300 xl:pl-8">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                    <div>
                      <h2 className="text-sm font-bold text-neutral-950">Agency activity</h2>
                      <p className="mt-0.5 text-xs text-neutral-500">Largest workspaces by athlete count</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('organizations')}
                      aria-label="View organizations"
                      className="text-neutral-400 hover:text-neutral-900"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="divide-y divide-neutral-200 border-b border-neutral-200">
                    {[...organizations]
                      .sort((a, b) => b.athleteCount - a.athleteCount)
                      .slice(0, 5)
                      .map(org => (
                        <button
                          key={org.id}
                          onClick={() => viewOrganization(org.id)}
                          className="flex w-full items-center gap-3 py-4 text-left hover:bg-white/60"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100 text-xs font-bold text-neutral-700">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-neutral-900">{org.name}</p>
                            <p className="text-xs text-neutral-500">{org.userCount} team members</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-neutral-900">{org.athleteCount}</p>
                            <p className="text-[10px] font-semibold uppercase text-neutral-400">athletes</p>
                          </div>
                        </button>
                      ))}
                    {organizations.length === 0 && (
                      <div className="py-12 text-center text-sm text-neutral-500">No organizations yet</div>
                    )}
                  </div>
                </section>
              </div>

            </div>
          )}

          {/* Organizations Tab */}
          {activeTab === 'organizations' && (
            <div className="mx-auto max-w-7xl">
              <div className="space-y-3 md:hidden">
                {organizations.map((org) => (
                  <div key={org.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-neutral-950">
                        <span className="text-sm font-bold text-white">{org.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">{org.name}</div>
                            <div className="text-xs text-gray-500">{org.slug}</div>
                          </div>
                          <div className="text-xs text-gray-400">{new Date(org.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Owner</p>
                            <p className="truncate text-gray-900">{org.owner?.name || '—'}</p>
                            {org.owner?.email && <p className="truncate text-xs text-gray-500">{org.owner.email}</p>}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Usage</p>
                            <p className="text-gray-900">{org.userCount} users · {org.athleteCount} athletes</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-end gap-3 text-sm font-medium">
                          <button
                            onClick={() => viewOrganization(org.id)}
                            className="text-brand-600 hover:text-brand-700"
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteOrganization(org.id, org.name)}
                            disabled={deletingOrgId === org.id}
                            className={`${
                              confirmDelete === org.id
                                ? 'rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700'
                                : 'text-red-600 hover:text-red-700'
                            } disabled:opacity-50`}
                          >
                            {deletingOrgId === org.id ? 'Deleting...' : confirmDelete === org.id ? 'Confirm?' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {organizations.length === 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center text-gray-500">
                    No organizations yet
                  </div>
                )}
              </div>

              <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-neutral-950">
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
            </div>
          )}

          {/* Access Requests Tab */}
          {activeTab === 'requests' && (
            <div className="mx-auto max-w-7xl">
              {requestUpdateError && (
                <div className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span>{requestUpdateError}</span>
                  <button onClick={() => setRequestUpdateError(null)} aria-label="Dismiss error">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-sm">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={requestSearch}
                    onChange={event => setRequestSearch(event.target.value)}
                    placeholder="Search agency, name, or email"
                    className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto rounded-md border border-neutral-200 bg-white p-1">
                  {(['all', 'new', 'contacted', 'closed'] as RequestFilter[]).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setRequestFilter(filter)}
                      className={`inline-flex flex-shrink-0 items-center gap-2 rounded px-3 py-1.5 text-xs font-bold capitalize ${
                        requestFilter === filter
                          ? 'bg-neutral-950 text-white'
                          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                    >
                      {filter}
                      <span className={requestFilter === filter ? 'text-neutral-300' : 'text-neutral-400'}>
                        {requestCounts[filter]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
                <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                      {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
                    </p>
                    <p className="text-xs text-neutral-400">Newest first</p>
                  </div>

                  <div className="divide-y divide-neutral-100">
                    {filteredRequests.map(request => {
                      const isSelected = selectedRequest?.id === request.id
                      return (
                        <button
                          key={request.id}
                          onClick={() => setSelectedRequestId(request.id)}
                          className={`flex w-full gap-4 px-4 py-4 text-left transition-colors ${
                            isSelected ? 'bg-sky-50/70' : 'hover:bg-neutral-50'
                          }`}
                        >
                          <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                            isSelected ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {request.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-bold text-neutral-950">{request.agency}</p>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${REQUEST_STATUS_STYLES[request.status]}`}>
                                {request.status}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm text-neutral-600">{request.name} · {request.email}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-neutral-400">
                              {request.message || 'No message included'}
                            </p>
                          </div>
                          <div className="hidden flex-shrink-0 text-right sm:block">
                            <p className="text-xs text-neutral-500">{new Date(request.created_at).toLocaleDateString()}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                              {request.roster_size ? `${request.roster_size} athletes` : 'Roster unknown'}
                            </p>
                          </div>
                        </button>
                      )
                    })}

                    {filteredRequests.length === 0 && (
                      <div className="px-6 py-16 text-center">
                        <InboxArrowDownIcon className="mx-auto h-8 w-8 text-neutral-300" />
                        <p className="mt-3 text-sm font-bold text-neutral-800">No matching requests</p>
                        <p className="mt-1 text-sm text-neutral-500">Adjust the search or status filter.</p>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="self-start overflow-hidden rounded-lg border border-neutral-200 bg-white xl:sticky xl:top-0">
                  {selectedRequest ? (
                    <>
                      <div className="border-b border-neutral-200 px-5 py-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-neutral-950 text-sm font-bold text-white">
                            {selectedRequest.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="truncate text-base font-bold text-neutral-950">{selectedRequest.agency}</h2>
                            <p className="mt-0.5 truncate text-sm text-neutral-500">{selectedRequest.name}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${REQUEST_STATUS_STYLES[selectedRequest.status]}`}>
                            {selectedRequest.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-5 px-5 py-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Received</p>
                            <p className="mt-1 text-sm font-semibold text-neutral-800">
                              {new Date(selectedRequest.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Roster</p>
                            <p className="mt-1 text-sm font-semibold text-neutral-800">
                              {selectedRequest.roster_size ? `${selectedRequest.roster_size} athletes` : 'Not provided'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Email</p>
                          <a href={`mailto:${selectedRequest.email}`} className="mt-1 block break-all text-sm font-bold text-brand-600 hover:text-brand-700">
                            {selectedRequest.email}
                          </a>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Message</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                            {selectedRequest.message || 'No additional message was included.'}
                          </p>
                        </div>

                        <div>
                          <label htmlFor={`request-status-${selectedRequest.id}`} className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                            Pipeline status
                          </label>
                          <select
                            id={`request-status-${selectedRequest.id}`}
                            aria-label={`Status for ${selectedRequest.name}`}
                            value={selectedRequest.status}
                            disabled={updatingRequestId === selectedRequest.id}
                            onChange={event => updateAccessRequestStatus(
                              selectedRequest.id,
                              event.target.value as AccessRequestStatus
                            )}
                            className={`mt-2 h-10 w-full rounded-md border px-3 text-sm font-bold capitalize outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-wait disabled:opacity-60 ${REQUEST_STATUS_STYLES[selectedRequest.status]}`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-neutral-200 bg-neutral-50 p-4">
                        <a
                          href={`mailto:${selectedRequest.email}?subject=${encodeURIComponent('AthleteDesk access')}`}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-3 py-2.5 text-sm font-bold text-white hover:bg-neutral-800"
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                          Email
                        </a>
                        <button
                          onClick={() => startInviteForRequest(selectedRequest)}
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm font-bold text-neutral-800 hover:bg-neutral-100"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Create invite
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-6 py-16 text-center">
                      <InboxArrowDownIcon className="mx-auto h-8 w-8 text-neutral-300" />
                      <p className="mt-3 text-sm font-bold text-neutral-800">Select a request</p>
                      <p className="mt-1 text-sm text-neutral-500">Agency details will appear here.</p>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          )}

          {activeTab === 'invites' && (
            <div className="mx-auto max-w-7xl space-y-4">
              {/* Create Button */}
              <div className="flex justify-start md:justify-end">
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

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
              <div>
                <div className="space-y-3 md:hidden">
                  {invites.map((invite) => {
                    const isExpired = new Date(invite.expires_at) < new Date()
                    const isUsed = !!invite.accepted_at

                    return (
                      <div key={invite.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-gray-900">{invite.email || 'General invite'}</div>
                            <div className="text-xs text-gray-500">{invite.invite_type === 'new_org' ? 'New org' : 'Join org'}</div>
                          </div>
                          <div className="shrink-0">
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
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">For</p>
                            <p className="truncate text-gray-900">{invite.organization?.name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Created</p>
                            <p className="text-gray-900">{new Date(invite.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-end gap-3 text-sm font-medium">
                          {!isUsed && !isExpired && (
                            <button
                              onClick={() => copyToClipboard(`${window.location.origin}/invite/${invite.token}`)}
                              className="text-brand-600 hover:underline"
                            >
                              Copy link
                            </button>
                          )}
                          {!isUsed && (
                            <button
                              onClick={() => deleteInvite(invite.id)}
                              disabled={deletingInviteId === invite.id}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              {deletingInviteId === invite.id ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {invites.length === 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center text-gray-500">
                      No invites yet
                    </div>
                  )}
                </div>

                <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                            <div className="flex items-center justify-end gap-3">
                              {!isUsed && !isExpired && (
                                <button
                                  onClick={() => copyToClipboard(`${window.location.origin}/invite/${invite.token}`)}
                                  className="text-sm text-brand-600 hover:underline"
                                >
                                  Copy link
                                </button>
                              )}
                              {!isUsed && (
                                <button
                                  onClick={() => deleteInvite(invite.id)}
                                  disabled={deletingInviteId === invite.id}
                                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                                >
                                  {deletingInviteId === invite.id ? 'Deleting...' : 'Delete'}
                                </button>
                              )}
                            </div>
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
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
