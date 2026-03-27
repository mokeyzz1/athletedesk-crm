import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserInsert } from '@/lib/database.types'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle OAuth errors from Supabase/Google
  if (errorParam) {
    console.error('OAuth error:', errorParam, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || errorParam)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=No authorization code received`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Code exchange error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  if (data.user) {
    // Check if user exists in our users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('google_sso_id', data.user.id)
      .single()

    // If user doesn't exist, create them
    if (!existingUser) {
      const newUser: UserInsert = {
        name: data.user.user_metadata.full_name || data.user.email?.split('@')[0] || 'Unknown',
        email: data.user.email!,
        google_sso_id: data.user.id,
        avatar_url: data.user.user_metadata.avatar_url,
        role: 'intern', // Default role, admin can upgrade
      }
      const { error: insertError } = await supabase.from('users').insert(newUser as never)
      if (insertError) {
        console.error('Failed to create user:', insertError)
        return NextResponse.redirect(`${origin}/login?error=Failed to create user profile: ${encodeURIComponent(insertError.message)}`)
      }
    } else {
      // Update avatar_url on every login to keep it fresh
      await supabase
        .from('users')
        .update({ avatar_url: data.user.user_metadata.avatar_url } as never)
        .eq('google_sso_id', data.user.id)
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // No user data returned
  return NextResponse.redirect(`${origin}/login?error=No user data received`)
}
