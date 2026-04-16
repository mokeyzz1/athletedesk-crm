'use client'

import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { User, UserRole, RecruitingRegion } from '@/lib/database.types'
import { updateUserRegions, updateUserRoles } from '@/lib/actions/users'
import { getPrimaryRole, getUserRoles, userHasRole } from '@/lib/roles'

const ALL_ROLES: UserRole[] = ['admin', 'agent', 'scout', 'marketing', 'intern']

export default function TeamManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingRolesUser, setEditingRolesUser] = useState<User | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([])
  const [primaryRole, setPrimaryRole] = useState<UserRole>('intern')
  const [savingRoles, setSavingRoles] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('intern')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [editingRegionsUser, setEditingRegionsUser] = useState<User | null>(null)
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [recruitingRegions, setRecruitingRegions] = useState<string[]>([])
  const [savingRegions, setSavingRegions] = useState(false)
  const [teamError, setTeamError] = useState('')

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      const profile = profileData as User | null

      if (!userHasRole(profile, 'admin')) {
        router.push('/settings')
        return
      }

      setCurrentUser(profile)

      const [usersResult, regionsResult] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('recruiting_regions')
          .select('name')
          .order('name'),
      ])

      setUsers((usersResult.data as User[]) || [])
      setRecruitingRegions(((regionsResult.data as Pick<RecruitingRegion, 'name'>[]) || []).map(r => r.name))
      setIsLoading(false)
    }

    fetchData()
  }, [supabase, router])

  const openRolesModal = (user: User) => {
    setEditingRolesUser(user)
    const userRoles = getUserRoles(user)
    setSelectedRoles(userRoles)
    setPrimaryRole(getPrimaryRole(user) || userRoles[0] || 'intern')
  }

  const toggleRole = (role: UserRole) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        // Removing role - if it's the primary, auto-pick another
        const newRoles = prev.filter(r => r !== role)
        if (role === primaryRole && newRoles.length > 0) {
          setPrimaryRole(newRoles[0])
        }
        return newRoles
      } else {
        return [...prev, role]
      }
    })
  }

  const saveRoles = async () => {
    if (!editingRolesUser || selectedRoles.length === 0) return

    setSavingRoles(true)
    setTeamError('')
    const result = await updateUserRoles(editingRolesUser.id, selectedRoles, primaryRole)

    if (result.success) {
      setUsers(users.map(u =>
        u.id === editingRolesUser.id
          ? { ...u, ...result.data }
          : u
      ))
      setEditingRolesUser(null)
    } else {
      setTeamError(result.error)
    }
    setSavingRoles(false)
  }

  const sendInvite = async () => {
    if (!inviteEmail) return

    setInviteSending(true)
    setInviteError('')
    setInviteSuccess(false)

    try {
      const response = await fetch('/api/team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invite')
      }

      setInviteLink(data.inviteUrl)
      setInviteSuccess(true)
      setInviteEmail('')
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Failed to send invite')
    } finally {
      setInviteSending(false)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member? This action cannot be undone.')) {
      return
    }

    setDeletingUser(userId)

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setUsers(users.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to remove team member. Please try again.')
    } finally {
      setDeletingUser(null)
    }
  }

  const openRegionsModal = (user: User) => {
    setEditingRegionsUser(user)
    setSelectedRegions(user.assigned_regions || [])
  }

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    )
  }

  const saveRegions = async () => {
    if (!editingRegionsUser) return

    setSavingRegions(true)
    setTeamError('')
    const result = await updateUserRegions(editingRegionsUser.id, selectedRegions)

    if (result.success) {
      setUsers(users.map(u =>
        u.id === editingRegionsUser.id
          ? { ...u, ...result.data }
          : u
      ))
      setEditingRegionsUser(null)
    } else {
      setTeamError(result.error)
    }
    setSavingRegions(false)
  }

  const getRoleBadge = (role: string) => {
    const roleClasses: Record<string, string> = {
      admin: 'badge-red',
      agent: 'badge-blue',
      scout: 'badge-green',
      marketing: 'badge-yellow',
      intern: 'badge-gray',
    }
    return roleClasses[role] || 'badge-gray'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-500 text-sm">Manage your team members and their roles</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Invite Member
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {teamError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {teamError}
        </div>
      )}
      {/* Role Legend */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="badge-red">Admin</span>
            <p className="mt-1 text-gray-500">Full access, team management</p>
          </div>
          <div>
            <span className="badge-blue">Agent</span>
            <p className="mt-1 text-gray-500">Manage athletes, deals, pipeline</p>
          </div>
          <div>
            <span className="badge-green">Scout</span>
            <p className="mt-1 text-gray-500">Add athletes, pipeline access</p>
          </div>
          <div>
            <span className="badge-yellow">Marketing</span>
            <p className="mt-1 text-gray-500">Brand outreach, communications</p>
          </div>
          <div>
            <span className="badge-gray">Intern</span>
            <p className="mt-1 text-gray-500">View-only access</p>
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Regions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="table-row-hover">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.avatar_url ? (
                      <Image
                        className="h-10 w-10 rounded-full"
                        src={user.avatar_url}
                        alt={user.name}
                        width={40}
                        height={40}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-brand-500 flex items-center justify-center text-sm font-medium text-white">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-gray-400">(you)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className={`${getRoleBadge(getPrimaryRole(user))} capitalize`}>
                      {getPrimaryRole(user)}
                    </span>
                    {getUserRoles(user).length > 1 && (
                      <span className="text-xs text-gray-500">
                        +{getUserRoles(user).length - 1} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.assigned_regions && user.assigned_regions.length > 0 ? (
                      user.assigned_regions.map(region => (
                        <span key={region} className="badge-blue text-xs">
                          {region}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.id !== currentUser?.id && (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openRolesModal(user)}
                        className="text-brand-600 hover:text-brand-900"
                      >
                        Edit Roles
                      </button>
                      <button
                        onClick={() => openRegionsModal(user)}
                        className="text-brand-600 hover:text-brand-900"
                      >
                        Edit Regions
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        disabled={deletingUser === user.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingUser === user.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h3>

            {inviteSuccess ? (
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 font-medium">Invite link created!</p>
                <p className="text-sm text-gray-500 mt-1">Share this link with the team member.</p>
                {inviteLink && (
                  <div className="mt-4 space-y-3">
                    <input
                      readOnly
                      value={inviteLink}
                      className="input w-full text-xs"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      className="btn-secondary text-sm"
                    >
                      Copy invite link
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Enter their email address and we&apos;ll create a secure invite link for them to join your team.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="label">Email Address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="input w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="label">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="input w-full mt-1"
                    >
                      <option value="intern">Intern (View Only)</option>
                      <option value="scout">Scout</option>
                      <option value="marketing">Marketing</option>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {inviteError && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
                      {inviteError}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteEmail('')
                      setInviteError('')
                      setInviteLink('')
                      setInviteSuccess(false)
                    }}
                    className="btn-secondary"
                    disabled={inviteSending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendInvite}
                    disabled={!inviteEmail || inviteSending}
                    className="btn-primary"
                  >
                    {inviteSending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      'Send Invite'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Roles Modal */}
      {editingRolesUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Edit Roles
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select roles for {editingRolesUser.name}. Click the star to set primary role.
            </p>

            <div className="space-y-2 mb-6">
              {ALL_ROLES.map(role => {
                const isSelected = selectedRoles.includes(role)
                const isPrimary = primaryRole === role
                return (
                  <div
                    key={role}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <label className="flex items-center flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRole(role)}
                        className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900 capitalize">{role}</span>
                    </label>
                    {isSelected && (
                      <button
                        onClick={() => setPrimaryRole(role)}
                        className={`p-1 rounded transition-colors ${
                          isPrimary
                            ? 'text-yellow-500'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                        title={isPrimary ? 'Primary role' : 'Set as primary'}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {selectedRoles.length === 0 && (
              <p className="text-sm text-red-600 mb-4">At least one role is required.</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingRolesUser(null)}
                className="btn-secondary"
                disabled={savingRoles}
              >
                Cancel
              </button>
              <button
                onClick={saveRoles}
                disabled={savingRoles || selectedRoles.length === 0}
                className="btn-primary"
              >
                {savingRoles ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Roles'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Regions Modal */}
      {editingRegionsUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Assign Regions
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select the regions {editingRegionsUser.name} will be responsible for.
            </p>

            <div className="space-y-2 mb-6">
              {recruitingRegions.length === 0 && (
                <p className="text-sm text-gray-500">No recruiting regions have been created yet.</p>
              )}
              {recruitingRegions.map(region => (
                <label
                  key={region}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRegions.includes(region)
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedRegions.includes(region)}
                    onChange={() => toggleRegion(region)}
                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">{region}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingRegionsUser(null)}
                className="btn-secondary"
                disabled={savingRegions}
              >
                Cancel
              </button>
              <button
                onClick={saveRegions}
                disabled={savingRegions}
                className="btn-primary"
              >
                {savingRegions ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Regions'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
