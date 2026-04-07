'use client'

import { useState, useEffect } from 'react'

interface SendCalendlyLinkButtonProps {
  athleteEmail?: string | null
  athleteName: string
}

export function SendCalendlyLinkButton({ athleteEmail, athleteName }: SendCalendlyLinkButtonProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null)
  const [showCopied, setShowCopied] = useState(false)

  useEffect(() => {
    // Check Calendly connection and get scheduling link
    async function checkCalendly() {
      try {
        const intRes = await fetch('/api/integrations')
        const intData = await intRes.json()
        const calendlyIntegration = intData.integrations?.find(
          (i: { provider: string; is_active: boolean }) =>
            i.provider === 'calendly' && i.is_active
        )

        if (calendlyIntegration) {
          setIsConnected(true)
          // Fetch the scheduling link
          const linkRes = await fetch('/api/calendly/scheduling-link')
          const linkData = await linkRes.json()
          if (linkData.url) {
            setSchedulingUrl(linkData.url)
          }
        } else {
          setIsConnected(false)
        }
      } catch {
        setIsConnected(false)
      }
    }
    checkCalendly()
  }, [])

  const copyLink = async () => {
    if (!schedulingUrl) return
    try {
      await navigator.clipboard.writeText(schedulingUrl)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  const openMailto = () => {
    if (!athleteEmail || !schedulingUrl) return
    const subject = encodeURIComponent('Schedule a Meeting')
    const body = encodeURIComponent(
      `Hi ${athleteName.split(' ')[0]},\n\nI'd love to schedule some time to chat. Please use the link below to book a meeting at your convenience:\n\n${schedulingUrl}\n\nBest regards`
    )
    window.location.href = `mailto:${athleteEmail}?subject=${subject}&body=${body}`
  }

  // Not loaded yet
  if (isConnected === null) {
    return null
  }

  // Not connected
  if (!isConnected || !schedulingUrl) {
    return null
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="btn-secondary flex-1 justify-center text-sm"
          title="Copy Calendly link"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showCopied ? 'Copied!' : 'Calendly Link'}
        </button>
        {athleteEmail && (
          <button
            onClick={openMailto}
            className="btn-secondary px-2"
            title="Send via email"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
