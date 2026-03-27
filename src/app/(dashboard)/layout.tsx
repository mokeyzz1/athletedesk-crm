import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { DashboardProviders } from '@/components/layout/dashboard-providers'
import type { User } from '@/lib/database.types'

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

  // Get user profile
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('google_sso_id', user.id)
    .single()

  const profile = data as User | null

  if (!profile) {
    // User is authenticated but has no profile - this shouldn't happen
    // Sign them out and redirect to login to try again
    await supabase.auth.signOut()
    redirect('/login?error=Profile not found. Please sign in again.')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar user={profile} />
      </div>

      {/* Mobile header with hamburger - only on mobile */}
      <div className="md:hidden">
        <MobileHeader user={profile} />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0">
        <DashboardProviders>
          {children}
        </DashboardProviders>
      </main>
    </div>
  )
}
