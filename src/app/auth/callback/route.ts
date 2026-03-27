import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserInsert } from '@/lib/database.types'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
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
        await supabase.from('users').insert(newUser as never)
      } else {
        // Update avatar_url on every login to keep it fresh
        await supabase
          .from('users')
          .update({ avatar_url: data.user.user_metadata.avatar_url } as never)
          .eq('google_sso_id', data.user.id)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}
