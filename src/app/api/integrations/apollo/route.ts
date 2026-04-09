import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Redirect to settings (Apollo uses API key, not OAuth)
export async function GET() {
  return NextResponse.redirect(new URL('/settings?integration=apollo', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}

// POST - Save Apollo API key
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { apiKey } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Verify the API key works by making a test request
    const testResponse = await fetch('https://api.apollo.io/v1/auth/health', {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
    })

    if (!testResponse.ok) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 })
    }

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .single() as { data: { id: string; organization_id: string } | null }

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for existing Apollo integration
    const { data: existing } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userData.id)
      .eq('provider', 'apollo')
      .single() as { data: { id: string } | null }

    if (existing) {
      // Update existing
      await supabase
        .from('user_integrations')
        .update({
          access_token: apiKey,
          is_active: true,
        } as never)
        .eq('id', existing.id)
    } else {
      // Insert new
      await supabase
        .from('user_integrations')
        .insert({
          user_id: userData.id,
          organization_id: userData.organization_id,
          provider: 'apollo',
          access_token: apiKey,
          is_active: true,
        } as never)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Apollo save error:', error)
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 })
  }
}
