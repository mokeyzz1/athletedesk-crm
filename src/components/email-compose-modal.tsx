'use client'

import { useState, useEffect } from 'react'
import { emailTemplates, applyTemplateVariables } from '@/lib/email-templates'

interface EmailComposeModalProps {
  athleteId: string
  athleteName: string
  athleteEmail: string
  schoolName?: string
  onClose: () => void
  onSuccess: () => void
}

export function EmailComposeModal({
  athleteId,
  athleteName,
  athleteEmail,
  schoolName,
  onClose,
  onSuccess,
}: EmailComposeModalProps) {
  const [to, setTo] = useState(athleteEmail)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const [gmailEmail, setGmailEmail] = useState<string | null>(null)

  useEffect(() => {
    // Check Gmail connection status
    async function checkGmail() {
      try {
        const res = await fetch('/api/gmail/status')
        const data = await res.json()
        setGmailConnected(data.connected)
        setGmailEmail(data.email)
      } catch {
        setGmailConnected(false)
      }
    }
    checkGmail()
  }, [])

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)

    if (!templateId) {
      setSubject('')
      setBody('')
      return
    }

    const template = emailTemplates.find(t => t.id === templateId)
    if (template) {
      const variables: Record<string, string> = {
        athlete_name: athleteName,
        school: schoolName || '[School]',
        user_name: '[Your Name]',
        agency_name: 'AthleteDesk',
        brand_name: '[Brand Name]',
      }

      setSubject(applyTemplateVariables(template.subject, variables))
      setBody(applyTemplateVariables(template.body, variables))
    }
  }

  const handleConnectGmail = async () => {
    try {
      // Pass current URL so we return here after connecting
      const returnUrl = encodeURIComponent(window.location.pathname)
      const res = await fetch(`/api/gmail/auth?returnUrl=${returnUrl}`)
      const data = await res.json()

      // If already connected, just update the state
      if (data.already_connected) {
        setGmailConnected(true)
        setGmailEmail(data.email)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError('Failed to connect to Gmail')
    }
  }

  const handleSend = async () => {
    if (!to || !subject || !body) {
      setError('Please fill in all fields')
      return
    }

    setIsSending(true)
    setError('')

    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          body,
          athleteId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  if (gmailConnected === null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Send Email</h3>
            {gmailConnected && gmailEmail && (
              <p className="text-sm text-gray-500">Sending from {gmailEmail}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!gmailConnected ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h4 className="mt-4 text-lg font-medium text-gray-900">Connect Gmail to send emails</h4>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Connect your Gmail account to send emails directly from AthleteDesk. Sent emails will be automatically logged.
              </p>
              <button onClick={handleConnectGmail} className="btn-primary mt-4">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
                Connect Gmail
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label className="label">To</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="input w-full mt-1"
                  placeholder="recipient@example.com"
                />
              </div>

              <div>
                <label className="label">Template (optional)</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="input w-full mt-1"
                >
                  <option value="">No template - Write custom email</option>
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input w-full mt-1"
                  placeholder="Email subject"
                />
              </div>

              <div>
                <label className="label">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="input w-full mt-1 font-mono text-sm"
                  placeholder="Write your message..."
                />
              </div>

              <p className="text-xs text-gray-500">
                This email will be sent from your connected Gmail account and automatically logged as a communication.
              </p>
            </div>
          )}
        </div>

        {gmailConnected && (
          <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary" disabled={isSending}>
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !to || !subject || !body}
              className="btn-primary"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Email
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
