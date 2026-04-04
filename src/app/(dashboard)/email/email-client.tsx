'use client'

import { useState, useEffect } from 'react'
import { User, EmailTemplate } from '@/lib/database.types'

interface Email {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  snippet: string
  body: string
  date: string
  isUnread: boolean
}

interface Athlete {
  id: string
  name: string
  email: string | null
  sport: string
}

interface StaffMember {
  id: string
  name: string
  gmail_email: string | null
}

interface EmailClientProps {
  currentUser: User
  templates: EmailTemplate[]
  athletes: Athlete[]
  staffMembers: StaffMember[]
}

type Tab = 'inbox' | 'sent' | 'templates'

export function EmailClient({ currentUser, templates, athletes, staffMembers }: EmailClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('inbox')
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)

  // Compose state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [sending, setSending] = useState(false)

  // Check Gmail connection
  useEffect(() => {
    async function checkGmail() {
      try {
        const res = await fetch('/api/gmail/status')
        const data = await res.json()
        setGmailConnected(data.connected)
      } catch {
        setGmailConnected(false)
      }
    }
    checkGmail()
  }, [])

  // Fetch emails
  useEffect(() => {
    if (gmailConnected === false) {
      setLoading(false)
      return
    }
    if (gmailConnected === null) return

    async function fetchEmails() {
      setLoading(true)
      setError(null)
      try {
        const endpoint = activeTab === 'inbox' ? '/api/gmail/inbox' : '/api/gmail/sent'
        const url = new URL(endpoint, window.location.origin)
        if (searchQuery) {
          url.searchParams.set('q', searchQuery)
        }

        const res = await fetch(url.toString())
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch emails')
        }

        setEmails(data.emails || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch emails')
        setEmails([])
      } finally {
        setLoading(false)
      }
    }

    if (activeTab !== 'templates') {
      fetchEmails()
    } else {
      setLoading(false)
    }
  }, [activeTab, gmailConnected, searchQuery])

  const handleConnectGmail = async () => {
    try {
      const res = await fetch('/api/gmail/auth?returnUrl=/email')
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Failed to connect Gmail')
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setComposeSubject(template.subject)
      setComposeBody(template.body)
    }
  }

  const handleSend = async () => {
    if (!composeTo || !composeSubject || !composeBody) return

    setSending(true)
    try {
      // Use selected athlete or try to find by email to log the communication
      let athleteId = selectedAthleteId || null
      if (!athleteId) {
        const matchedAthlete = athletes.find(a =>
          a.email?.toLowerCase() === composeTo.toLowerCase()
        )
        athleteId = matchedAthlete?.id || null
      }

      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
          athleteId,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to send email')
      }

      // Reset compose form
      setShowCompose(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      setSelectedTemplate('')
      setSelectedAthleteId('')

      // Refresh sent emails
      if (activeTab === 'sent') {
        setActiveTab('inbox')
        setTimeout(() => setActiveTab('sent'), 100)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleReply = () => {
    if (!selectedEmail) return
    setComposeTo(selectedEmail.from.replace(/.*<(.+)>.*/, '$1') || selectedEmail.from)
    setComposeSubject(selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`)
    setComposeBody(`\n\n---\nOn ${new Date(selectedEmail.date).toLocaleDateString()}, ${selectedEmail.from} wrote:\n${selectedEmail.body}`)
    setShowCompose(true)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const extractName = (fromStr: string) => {
    const match = fromStr.match(/^"?([^"<]+)"?\s*</)
    return match ? match[1].trim() : fromStr.split('@')[0]
  }

  if (gmailConnected === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!gmailConnected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 h-16 md:h-[72px] flex items-center justify-between px-4 md:px-6 bg-gray-50 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Email</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Gmail to get started</h2>
            <p className="text-gray-500 mb-6">
              Connect your Gmail account to send and receive emails directly from AthleteDesk.
            </p>
            <button onClick={handleConnectGmail} className="btn-primary">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
              Connect Gmail
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-16 md:h-[72px] flex items-center justify-between px-4 md:px-6 bg-gray-50 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Email</h1>
        <button
          onClick={() => setShowCompose(true)}
          className="btn-primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Compose
        </button>
      </div>

      {/* Tabs and Search */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            <button
              onClick={() => { setActiveTab('inbox'); setSelectedEmail(null) }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => { setActiveTab('sent'); setSelectedEmail(null) }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'sent'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => { setActiveTab('templates'); setSelectedEmail(null) }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'templates'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Templates
            </button>
          </div>

          {activeTab !== 'templates' && (
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'templates' ? (
          /* Templates View */
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setComposeTo('')
                    setComposeSubject(template.subject)
                    setComposeBody(template.body)
                    setSelectedTemplate(template.id)
                    setShowCompose(true)
                  }}
                >
                  <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{template.subject}</p>
                  <p className="text-xs text-gray-400 line-clamp-2">{template.body}</p>
                  {template.is_shared && (
                    <span className="inline-flex mt-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      Shared
                    </span>
                  )}
                </div>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No templates yet. Create templates in Settings.
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Email List */}
            <div className={`w-full md:w-96 border-r border-gray-200 bg-white overflow-y-auto ${selectedEmail ? 'hidden md:block' : ''}`}>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-600">{error}</div>
              ) : emails.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p>No emails found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedEmail?.id === email.id ? 'bg-brand-50' : ''
                      } ${email.isUnread ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm truncate ${email.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {activeTab === 'inbox' ? extractName(email.from) : extractName(email.to)}
                        </p>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(email.date)}</span>
                      </div>
                      <p className={`text-sm truncate mb-1 ${email.isUnread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {email.subject || '(no subject)'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{email.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email Preview */}
            <div className={`flex-1 bg-gray-50 overflow-y-auto ${!selectedEmail ? 'hidden md:flex md:items-center md:justify-center' : ''}`}>
              {selectedEmail ? (
                <div className="h-full flex flex-col bg-white">
                  {/* Mobile back button */}
                  <div className="md:hidden p-3 border-b border-gray-200">
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="flex items-center text-sm text-gray-600"
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                  </div>

                  {/* Email header */}
                  <div className="p-4 md:p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">{selectedEmail.subject || '(no subject)'}</h2>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm">
                          <span className="text-gray-500">From:</span>{' '}
                          <span className="font-medium text-gray-900">{selectedEmail.from}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-500">To:</span>{' '}
                          <span className="text-gray-700">{selectedEmail.to}</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(selectedEmail.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReply}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Email body */}
                  <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {selectedEmail.body}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p>Select an email to read</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-2xl md:rounded-lg shadow-xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">New Email</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Template selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template (optional)</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">No template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>

              {/* To field with athlete suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  list="athlete-emails"
                />
                <datalist id="athlete-emails">
                  {athletes.filter(a => a.email).map((athlete) => (
                    <option key={athlete.id} value={athlete.email || ''}>
                      {athlete.name} ({athlete.sport})
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Link to athlete (for tracking) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Athlete <span className="font-normal text-gray-500">(for email counts)</span>
                </label>
                <select
                  value={selectedAthleteId}
                  onChange={(e) => {
                    setSelectedAthleteId(e.target.value)
                    // Auto-fill email if athlete selected and To field is empty
                    if (e.target.value && !composeTo) {
                      const athlete = athletes.find(a => a.id === e.target.value)
                      if (athlete?.email) setComposeTo(athlete.email)
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Auto-detect from email</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name} ({athlete.sport})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Links this email to an athlete&apos;s communication history
                </p>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={10}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !composeTo || !composeSubject || !composeBody}
                className="btn-primary disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
