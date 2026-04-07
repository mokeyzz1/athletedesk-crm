'use client'

import { useState, useEffect } from 'react'

interface DocuSignTemplate {
  templateId: string
  name: string
  description?: string
}

interface SendContractModalProps {
  athleteId: string
  athleteName: string
  athleteEmail?: string
  onClose: () => void
  onSuccess: () => void
}

export function SendContractModal({
  athleteId,
  athleteName,
  athleteEmail,
  onClose,
  onSuccess,
}: SendContractModalProps) {
  const [templates, setTemplates] = useState<DocuSignTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [recipientEmail, setRecipientEmail] = useState(athleteEmail || '')
  const [recipientName, setRecipientName] = useState(athleteName)
  const [contractTitle, setContractTitle] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBlurb, setEmailBlurb] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [docuSignConnected, setDocuSignConnected] = useState<boolean | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setLoading(true)
    try {
      // Check if DocuSign is connected
      const intRes = await fetch('/api/integrations')
      const intData = await intRes.json()
      const dsIntegration = intData.integrations?.find(
        (i: { provider: string; is_active: boolean }) =>
          i.provider === 'docusign' && i.is_active
      )

      if (!dsIntegration) {
        setDocuSignConnected(false)
        setLoading(false)
        return
      }

      setDocuSignConnected(true)

      // Fetch templates
      const templatesRes = await fetch('/api/contracts/templates')
      const templatesData = await templatesRes.json()

      if (templatesData.templates) {
        setTemplates(templatesData.templates)
      }
    } catch (err) {
      setError('Failed to load templates')
    }
    setLoading(false)
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const template = templates.find(t => t.templateId === templateId)
    if (template) {
      setContractTitle(template.name)
      setEmailSubject(`Contract: ${template.name}`)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTemplateId || !recipientEmail || !recipientName || !contractTitle) {
      setError('Please fill in all required fields')
      return
    }

    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId,
          templateId: selectedTemplateId,
          recipientEmail,
          recipientName,
          title: contractTitle,
          emailSubject: emailSubject || `Contract: ${contractTitle}`,
          emailBlurb: emailBlurb || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send contract')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send contract')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
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
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Send Contract</h3>
            <p className="text-sm text-gray-500">to {athleteName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!docuSignConnected ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="mt-4 text-lg font-medium text-gray-900">Connect DocuSign</h4>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Connect your DocuSign account to send contracts for electronic signature.
              </p>
              <button
                onClick={() => window.location.href = '/api/integrations/docusign'}
                className="btn-primary mt-4"
              >
                Connect DocuSign
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label className="label">Contract Template *</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="input w-full mt-1"
                  required
                >
                  <option value="">Select a template</option>
                  {templates.map((template) => (
                    <option key={template.templateId} value={template.templateId}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No templates found. Create templates in DocuSign first.
                  </p>
                )}
              </div>

              <div>
                <label className="label">Contract Title *</label>
                <input
                  type="text"
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  className="input w-full mt-1"
                  placeholder="e.g., Representation Agreement"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Recipient Name *</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="input w-full mt-1"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="label">Recipient Email *</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="input w-full mt-1"
                    placeholder="athlete@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Email Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="input w-full mt-1"
                  placeholder="Please sign your contract"
                />
              </div>

              <div>
                <label className="label">Email Message (optional)</label>
                <textarea
                  value={emailBlurb}
                  onChange={(e) => setEmailBlurb(e.target.value)}
                  rows={3}
                  className="input w-full mt-1"
                  placeholder="Add a personal message..."
                />
              </div>
            </form>
          )}
        </div>

        {docuSignConnected && (
          <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary" disabled={sending}>
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !selectedTemplateId || !recipientEmail}
              className="btn-primary"
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
                  Send Contract
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
