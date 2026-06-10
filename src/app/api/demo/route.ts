import { createClient } from '@/lib/supabase/server'
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
