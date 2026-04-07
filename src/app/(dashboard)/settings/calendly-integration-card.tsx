'use client'

import { useState, useEffect } from 'react'

interface CalendlyIntegrationCardProps {
  isConnected: boolean
  accountName?: string
  onDisconnect: () => void
}

export function CalendlyIntegrationCard({
  isConnected,
  accountName,
  onDisconnect,
}: CalendlyIntegrationCardProps) {
  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch scheduling URL when connected
  useEffect(() => {
    if (isConnected) {
      fetchSchedulingUrl()
    }
  }, [isConnected])

  const fetchSchedulingUrl = async () => {
    setLoadingUrl(true)
    try {
      const response = await fetch('/api/calendly/scheduling-link')
      const data = await response.json()
      if (data.url) {
        setSchedulingUrl(data.url)
      }
    } catch (error) {
      console.error('Failed to fetch scheduling URL:', error)
    }
    setLoadingUrl(false)
  }

  const copyToClipboard = async () => {
    if (!schedulingUrl) return
    try {
      await navigator.clipboard.writeText(schedulingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Calendly</h3>
          {isConnected ? (
            <p className="text-sm text-green-600">
              Connected as {accountName}
            </p>
          ) : (
            <p className="text-sm text-gray-500">Share scheduling links with athletes and prospects</p>
          )}
        </div>
        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => window.location.href = '/api/integrations/calendly'}
            className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-600 rounded-lg hover:bg-brand-50"
          >
            Connect
          </button>
        )}
      </div>

      {/* Scheduling URL section */}
      {isConnected && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Your Scheduling Link
          </label>
          {loadingUrl ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full"></div>
              Loading...
            </div>
          ) : schedulingUrl ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={schedulingUrl}
                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
              />
              <button
                onClick={copyToClipboard}
                className="px-3 py-2 text-sm font-medium text-brand-600 border border-brand-600 rounded-lg hover:bg-brand-50 flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Could not load scheduling link</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Share this link with athletes to let them book meetings directly on your calendar.
          </p>
        </div>
      )}
    </div>
  )
}
