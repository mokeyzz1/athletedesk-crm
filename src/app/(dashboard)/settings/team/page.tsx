'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { User, UserRole } from '@/lib/database.types'

export default function TeamManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('intern')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [deletingUser, setDeletingUser] = useState<string | null>(null)

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
        .eq('google_sso_id', user.id)
        .single()

      const profile = profileData as User | null

      if (!profile || profile.role !== 'admin') {
        router.push('/settings')
        return
      }

      setCurrentUser(profile)

      const { data: allUsersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      setUsers((allUsersData as User[]) || [])
      setIsLoading(false)
    }

    fetchData()
  }, [supabase, router])

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole } as never)
      .eq('id', userId)

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setEditingUser(null)
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail) return

    setInviteSending(true)
    setInviteError('')
    setInviteSuccess(false)

    try {
      // Send magic link invitation
      const { error } = await supabase.auth.signInWithOtp({
        email: inviteEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            invited_role: inviteRole,
          }
        }
      })

      if (error) throw error

      setInviteSuccess(true)
      setInviteEmail('')
      setTimeout(() => {
        setShowInviteModal(false)
        setInviteSuccess(false)
      }, 2000)
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
                    <img
                      className="h-10 w-10 rounded-full"
                      src={user.avatar_url || ''}
                      alt={user.name}
                    />
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
                  {editingUser === user.id ? (
                    <select
                      defaultValue={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                      onBlur={() => setEditingUser(null)}
                      autoFocus
                      className="input text-sm py-1"
                    >
                      <option value="admin">Admin</option>
                      <option value="agent">Agent</option>
                      <option value="scout">Scout</option>
                      <option value="marketing">Marketing</option>
                      <option value="intern">Intern</option>
                    </select>
                  ) : (
                    <span className={`${getRoleBadge(user.role)} capitalize`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.id !== currentUser?.id && (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setEditingUser(user.id)}
                        className="text-brand-600 hover:text-brand-900"
                      >
                        Edit Role
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
                <p className="text-green-600 font-medium">Invitation sent!</p>
                <p className="text-sm text-gray-500 mt-1">They&apos;ll receive an email with a magic link to join.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Enter their email address and we&apos;ll send them a magic link to join your team.
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
      </div>
    </div>
  )
}
