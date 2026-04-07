import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  // Validate the invite token using RPC function
  interface InviteResult {
    invite_id: string
    invite_email: string | null
    invite_type: string
    organization_id: string | null
    organization_name: string | null
  }

  const { data, error } = await supabase.rpc('validate_invite_token' as never, {
    invite_token: token,
  } as never) as { data: InviteResult[] | null; error: { message: string } | null }

  if (error || !data || data.length === 0) {
    return NextResponse.json(
      { error: 'Invalid or expired invite', valid: false },
      { status: 400 }
    )
  }

  const invite = data[0]

  return NextResponse.json({
    valid: true,
    email: invite.invite_email,
    inviteType: invite.invite_type,
    organizationName: invite.organization_name,
  })
}
