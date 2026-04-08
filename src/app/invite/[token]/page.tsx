'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface InviteData {
  valid: boolean
  email: string | null
  inviteType: 'new_org' | 'join_org'
  organizationName: string | null
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const token = params.token as string
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const validateInvite = async () => {
      try {
        const response = await fetch(`/api/invite/${token}/validate`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invite')
          return
        }

        setInvite(data)

        // Store invite token in cookie
        document.cookie = `invite_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      } catch {
        setError('Failed to validate invite')
      } finally {
        setLoading(false)
      }
    }

    validateInvite()
  }, [token])

  const handleAccept = async () => {
    // Sign out any existing session first
    await supabase.auth.signOut()

    // If invite has a specific email, pass it to login for auto-selection
    if (invite?.email) {
      router.push(`/login?hint=${encodeURIComponent(invite.email)}`)
    } else {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !invite?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            Invalid or Expired Invite
          </h2>
          <p className="mt-2 text-center text-gray-600">
            {error || 'This invite link is no longer valid. Please request a new invite.'}
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-white">AD</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          You&apos;re Invited!
        </h2>
        <p className="mt-2 text-center text-gray-600">
          {invite.inviteType === 'join_org'
            ? `Join ${invite.organizationName} on AthleteDesk`
            : 'Create your agency on AthleteDesk'
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              {invite.inviteType === 'join_org' ? 'Join Your Team' : 'Start Your Agency'}
            </h3>
          </div>

          {invite.email && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">This invite is for:</p>
              <p className="font-medium text-gray-900">{invite.email}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleAccept}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue with Google
            </button>

            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
