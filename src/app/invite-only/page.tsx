'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function InviteOnlyContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = () => {
    switch (error) {
      case 'invalid_invite':
        return 'Your invite link has expired or is invalid. Please request a new invite.'
      case 'email_mismatch':
        return 'This invite was sent to a different email address. Please sign in with the correct account.'
      default:
        return null
    }
  }

  const errorMessage = getErrorMessage()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-white">AD</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Invite Only
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          AthleteDesk is currently in private beta
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div className="text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              You need an invite to join
            </h3>

            <p className="text-gray-600 mb-6">
              AthleteDesk is currently available by invitation only. If you&apos;re a sports agency
              looking to manage your athletes, reach out to get access.
            </p>

            <div className="space-y-4">
              <a
                href="mailto:hello@athletedesk.app?subject=AthleteDesk%20Access%20Request"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Request Access
              </a>

              <Link
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Login
              </Link>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-xs text-center text-gray-500">
              Already have an invite link? Make sure you&apos;re using the correct link
              and signing in with the invited email address.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InviteOnlyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <InviteOnlyContent />
    </Suspense>
  )
}
