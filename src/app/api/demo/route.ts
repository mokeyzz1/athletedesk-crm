import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DEMO_USER_EMAIL } from '@/lib/demo'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  const password = process.env.DEMO_USER_PASSWORD
  if (!password) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Demo not configured. Set DEMO_USER_PASSWORD.')}`
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Never replace a real signed-in workspace session with the shared demo
  // account. Super admins go directly to the control center.
  if (user?.email && user.email.toLowerCase() !== DEMO_USER_EMAIL.toLowerCase()) {
    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
      .from('users')
      .select('is_super_admin')
      .eq('auth_user_id', user.id)
      .single() as { data: { is_super_admin: boolean } | null }

    return NextResponse.redirect(`${origin}${profile?.is_super_admin ? '/admin' : '/dashboard'}`)
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_USER_EMAIL,
    password,
  })

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Demo sign-in failed: ' + error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
