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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and team</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            {profile?.avatar_url ? (
              <img
                className="h-20 w-20 rounded-full"
                src={profile.avatar_url}
                alt={profile.name}
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-brand-600 flex items-center justify-center">
                <span className="text-white text-2xl font-medium">
                  {profile?.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            )}
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
      )}
    </div>
  )
}
