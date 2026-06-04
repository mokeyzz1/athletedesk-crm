import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { DashboardProviders } from '@/components/layout/dashboard-providers'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'
import type { User } from '@/lib/database.types'

// Disable caching to ensure fresh impersonation state
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use service client to get user profile (bypasses RLS for super admin)
  // Uses auth_user_id as the primary lookup key (provider-neutral)
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  const profile = data as User | null

  if (!profile) {
    // User is authenticated but has no profile - this shouldn't happen
    // Sign them out and redirect to login to try again
    await supabase.auth.signOut()
    redirect('/login?error=Profile not found. Please sign in again.')
  }

  // Check if super admin is impersonating another org
  let impersonatedOrgName: string | null = null
  if (profile.is_super_admin && profile.viewing_organization_id) {
    const { data: orgData } = await serviceClient
      .from('organizations')
      .select('name')
      .eq('id', profile.viewing_organization_id)
      .single() as { data: { name: string } | null }
    impersonatedOrgName = orgData?.name || null
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Impersonation banner */}
      {impersonatedOrgName && (
        <ImpersonationBanner organizationName={impersonatedOrgName} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar user={profile} />
        </div>

        {/* Mobile header with hamburger - only on mobile */}
        <div className="md:hidden">
          <MobileHeader user={profile} />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden pt-14 pb-[calc(env(safe-area-inset-bottom)+64px)] md:pt-0 md:pb-0">
          <DashboardProviders>
            {children}
          </DashboardProviders>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}
