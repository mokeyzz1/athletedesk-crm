import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const accessRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  agency: z.string().trim().min(1, 'Agency is required').max(160),
  email: z.string().trim().email('Enter a valid email').max(200),
  rosterSize: z.enum(['<25', '25-100', '100-500', '500+']).optional(),
  message: z.string().trim().max(1000).optional(),
  // honeypot — real users never fill this (checked after parse for a quiet fake success)
  website: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = accessRequestSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Invalid request'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // bots that filled the honeypot get a quiet "success"
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true })
  }

  const serviceClient = createServiceClient()
  // table not yet in generated database.types.ts — cast until types are regenerated
  const { error } = await serviceClient.from('access_requests').insert({
    name: parsed.data.name,
    agency: parsed.data.agency,
    email: parsed.data.email,
    roster_size: parsed.data.rosterSize ?? null,
    message: parsed.data.message || null,
  } as never)

  if (error) {
    console.error('access request insert failed:', error)
    return NextResponse.json({ error: 'Something went wrong — please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
