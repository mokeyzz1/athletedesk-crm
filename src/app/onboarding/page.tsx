'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const AGENCY_TYPES = [
  { value: 'full_service', label: 'Full Service Agency', description: 'Recruiting, contracts, marketing, and brand deals' },
  { value: 'recruiting', label: 'Recruiting Focus', description: 'Primarily athlete recruiting and placement' },
  { value: 'marketing', label: 'Marketing & NIL', description: 'Focus on brand deals and NIL opportunities' },
  { value: 'management', label: 'Athlete Management', description: 'Career and contract management' },
]

const SPORTS = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Hockey',
  'Golf', 'Tennis', 'Track & Field', 'Swimming', 'Volleyball',
  'Softball', 'Lacrosse', 'Wrestling', 'Gymnastics', 'Other'
]

interface PendingUser {
  name: string
  email: string
  auth_user_id: string
  google_sso_id: string | null
  avatar_url: string | null
  invite_id: string
  invite_type: 'new_org' | 'join_org'
  organization_id: string | null
  organization_name: string | null
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null)

  // Form state
  const [agencyName, setAgencyName] = useState('')
  const [agencyType, setAgencyType] = useState('')
  const [selectedSports, setSelectedSports] = useState<string[]>([])

  useEffect(() => {
    // Check for pending user data
    const checkPendingUser = async () => {
      try {
        const response = await fetch('/api/onboarding/check')
        if (!response.ok) {
          router.push('/invite-only')
          return
        }
        const data = await response.json()
        setPendingUser(data.pendingUser)

        // If joining existing org, skip to confirmation step
        if (data.pendingUser.invite_type === 'join_org') {
          setStep(3)
        }
      } catch {
        router.push('/invite-only')
      } finally {
        setLoading(false)
      }
    }

    checkPendingUser()
  }, [router])

  const handleSportToggle = (sport: string) => {
    setSelectedSports(prev =>
      prev.includes(sport)
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    )
  }

  const handleSubmit = async () => {
    if (!pendingUser) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: pendingUser.invite_type === 'new_org' ? agencyName : undefined,
          agencyType: pendingUser.invite_type === 'new_org' ? agencyType : undefined,
          selectedSports: pendingUser.invite_type === 'new_org' ? selectedSports : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to complete onboarding')
      }

      // Redirect to dashboard
      router.push('/dashboard?welcome=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!pendingUser) {
    return null
  }

  const isJoining = pendingUser.invite_type === 'join_org'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">AD</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isJoining ? 'Join Your Team' : 'Set Up Your Agency'}
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome, {pendingUser.name}! Let&apos;s get you started.
          </p>
        </div>

        {/* Progress Steps */}
        {!isJoining && (
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-16 h-1 ${
                        step > s ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-2">
              <span className="text-xs text-gray-500">Agency Info</span>
              <span className="text-xs text-gray-500">Sports</span>
              <span className="text-xs text-gray-500">Confirm</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white shadow rounded-lg p-6">
          {/* Step 1: Agency Info */}
          {step === 1 && !isJoining && (
            <div className="space-y-6">
              <div>
                <label htmlFor="agencyName" className="block text-sm font-medium text-gray-700">
                  Agency Name *
                </label>
                <input
                  type="text"
                  id="agencyName"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Elite Sports Management"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Agency Type *
                </label>
                <div className="space-y-3">
                  {AGENCY_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                        agencyType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="agencyType"
                        value={type.value}
                        checked={agencyType === type.value}
                        onChange={(e) => setAgencyType(e.target.value)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <span className="block text-sm font-medium text-gray-900">
                          {type.label}
                        </span>
                        <span className="block text-sm text-gray-500">
                          {type.description}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!agencyName || !agencyType}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Sports Selection */}
          {step === 2 && !isJoining && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What sports does your agency focus on? *
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Select all that apply. You can change this later.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SPORTS.map((sport) => (
                    <label
                      key={sport}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSports.includes(sport)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSports.includes(sport)}
                        onChange={() => handleSportToggle(sport)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">{sport}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedSports.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                {pendingUser.avatar_url && (
                  <Image
                    src={pendingUser.avatar_url}
                    alt={pendingUser.name}
                    width={80}
                    height={80}
                    className="mx-auto rounded-full"
                  />
                )}
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {pendingUser.name}
                </h3>
                <p className="text-gray-500">{pendingUser.email}</p>
              </div>

              {isJoining ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">You&apos;re joining:</h4>
                  <p className="text-lg text-gray-900">{pendingUser.organization_name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    You&apos;ll have access to the team&apos;s athletes, communications, and more.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Agency Name</span>
                    <p className="text-gray-900">{agencyName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Agency Type</span>
                    <p className="text-gray-900">
                      {AGENCY_TYPES.find(t => t.value === agencyType)?.label}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Sports Focus</span>
                    <p className="text-gray-900">{selectedSports.join(', ')}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                {!isJoining && (
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 ${
                    isJoining ? 'w-full' : ''
                  }`}
                >
                  {submitting ? 'Creating...' : isJoining ? 'Join Team' : 'Create Agency'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
