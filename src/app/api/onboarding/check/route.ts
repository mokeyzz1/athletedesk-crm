import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const pendingUserCookie = cookieStore.get('pending_user')

  if (!pendingUserCookie?.value) {
    return NextResponse.json({ error: 'No pending user' }, { status: 401 })
  }

  try {
    const pendingUser = JSON.parse(pendingUserCookie.value)
    return NextResponse.json({ pendingUser })
  } catch {
    return NextResponse.json({ error: 'Invalid pending user data' }, { status: 400 })
  }
}
