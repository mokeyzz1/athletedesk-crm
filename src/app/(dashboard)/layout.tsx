import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
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
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
