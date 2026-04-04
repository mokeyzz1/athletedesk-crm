'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export function GmailSettings() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [gmailEmail, setGmailEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check URL params for Gmail callback results
    const gmailParam = searchParams.get('gmail')
    if (gmailParam === 'connected') {
      setMessage({ type: 'success', text: 'Gmail connected successfully!' })
    } else if (gmailParam === 'error') {
      setMessage({ type: 'error', text: 'Failed to connect Gmail. Please try again.' })
    }

    // Fetch Gmail status
    async function fetchStatus() {
      try {
        const res = await fetch('/api/gmail/status')
        const data = await res.json()
        setIsConnected(data.connected)
        setGmailEmail(data.email)
      } catch {
        setIsConnected(false)
      }
    }
    fetchStatus()
  }, [searchParams])

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/gmail/auth')
      const data = await res.json()

      // If already connected, just update the state
      if (data.already_connected) {
        setIsConnected(true)
        setGmailEmail(data.email)
        setMessage({ type: 'success', text: 'Gmail is already connected!' })
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to start Gmail connection' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? You will not be able to send emails directly from AthleteDesk until you reconnect.')) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/gmail/disconnect', { method: 'POST' })
      if (res.ok) {
        setIsConnected(false)
        setGmailEmail(null)
        setMessage({ type: 'success', text: 'Gmail disconnected successfully' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect Gmail' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isConnected === null) {
    return (
      <div className="card">
        <div className="animate-pulse flex items-center gap-4">
          <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
            <svg className={`w-6 h-6 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gmail Integration</h2>
            {isConnected ? (
              <p className="text-sm text-gray-500">
                Connected as <span className="font-medium text-gray-700">{gmailEmail}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Connect Gmail to send emails directly from AthleteDesk
              </p>
            )}
          </div>
        </div>

        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="btn-secondary text-red-600 hover:text-red-700 hover:border-red-300"
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
                Connect Gmail
              </>
            )}
          </button>
        )}
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <p>{message.text}</p>
          {message.type === 'success' && isConnected && (
            <div className="mt-2 flex gap-3">
              <Link href="/recruiting" className="font-medium text-green-800 hover:text-green-900 underline">
                Go to Recruiting →
              </Link>
              <Link href="/athletes" className="font-medium text-green-800 hover:text-green-900 underline">
                Go to Roster →
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        {isConnected ? (
          <>
            <h3 className="text-sm font-medium text-gray-700 mb-2">You&apos;re all set! Here&apos;s how to send emails:</h3>
            <ol className="text-sm text-gray-500 space-y-2 list-decimal list-inside">
              <li>Go to <Link href="/recruiting" className="text-brand-600 hover:underline">Recruiting</Link> or <Link href="/athletes" className="text-brand-600 hover:underline">Roster</Link></li>
              <li>Click on an athlete&apos;s name to view their profile</li>
              <li>Click the <span className="font-medium text-gray-700">Send Email</span> button</li>
              <li>Choose a template or write your own message</li>
            </ol>
          </>
        ) : (
          <>
            <h3 className="text-sm font-medium text-gray-700 mb-2">What you can do with Gmail integration:</h3>
            <ul className="text-sm text-gray-500 space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Send emails to athletes directly from their profile
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Use pre-built email templates for common messages
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Automatically log sent emails as communications
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
