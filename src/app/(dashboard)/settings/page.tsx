import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { User } from '@/lib/database.types'
import { GmailSettings } from './gmail-settings'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('google_sso_id', user?.id ?? '')
    .single()

  const profile = data as User | null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center px-6 bg-gray-50 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your account and team</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <img
              className="h-20 w-20 rounded-full"
              src={profile?.avatar_url || ''}
              alt={profile?.name || ''}
            />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{profile?.name}</h3>
              <p className="text-gray-500">{profile?.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1">
                  <span className={`badge capitalize ${
                    profile?.role === 'admin' ? 'badge-red' :
                    profile?.role === 'agent' ? 'badge-blue' :
                    profile?.role === 'scout' ? 'badge-green' :
                    profile?.role === 'marketing' ? 'badge-yellow' : 'badge-gray'
                  }`}>
                    {profile?.role}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Member since</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Gmail Integration */}
      <GmailSettings />

      {profile?.role === 'admin' && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Team Management</h2>
                <p className="text-sm text-gray-500">Invite team members and manage roles</p>
              </div>
              <Link href="/settings/team" className="btn-primary">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Invite Member
              </Link>
            </div>
            <p className="text-gray-600 text-sm">
              As an admin, you can invite new team members and assign them roles (Agent, Scout, Marketing, or Intern).
              Each role has different permissions for managing athletes, deals, and communications.
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Outreach Goals</h2>
                <p className="text-sm text-gray-500">Set communication targets for your team</p>
              </div>
              <Link href="/settings/outreach-goals" className="btn-primary">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Manage Goals
              </Link>
            </div>
            <p className="text-gray-600 text-sm">
              Create goals to track how many emails, calls, or communications each staff member should complete.
              Progress is shown on the Dashboard and Recruiting pages.
            </p>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
