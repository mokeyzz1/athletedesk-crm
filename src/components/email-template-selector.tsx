'use client'

import { useState } from 'react'
import { emailTemplates, applyTemplateVariables, type EmailTemplate } from '@/lib/email-templates'

interface EmailTemplateSelectorProps {
  onSelect: (subject: string, body: string) => void
  athleteName?: string
  schoolName?: string
  onClose: () => void
}

export function EmailTemplateSelector({ onSelect, athleteName, schoolName, onClose }: EmailTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewBody, setPreviewBody] = useState('')

  const categories = [
    { key: 'outreach', label: 'Outreach', color: 'bg-blue-100 text-blue-700' },
    { key: 'followup', label: 'Follow-up', color: 'bg-yellow-100 text-yellow-700' },
    { key: 'contract', label: 'Contract', color: 'bg-purple-100 text-purple-700' },
    { key: 'nil', label: 'NIL', color: 'bg-green-100 text-green-700' },
    { key: 'signing', label: 'Signing', color: 'bg-brand-100 text-brand-700' },
  ]

  const handleTemplateClick = (template: EmailTemplate) => {
    setSelectedTemplate(template)

    const variables: Record<string, string> = {
      athlete_name: athleteName || '[Athlete Name]',
      school: schoolName || '[School]',
      user_name: '[Your Name]',
      agency_name: 'AthleteDesk',
      brand_name: '[Brand Name]',
    }

    setPreviewSubject(applyTemplateVariables(template.subject, variables))
    setPreviewBody(applyTemplateVariables(template.body, variables))
  }

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelect(previewSubject, previewBody)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Template List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-4">
            <div className="space-y-2">
              {emailTemplates.map((template) => {
                const category = categories.find(c => c.key === template.category)
                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{template.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${category?.color}`}>
                        {category?.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{template.subject}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Subject</label>
                  <input
                    type="text"
                    value={previewSubject}
                    onChange={(e) => setPreviewSubject(e.target.value)}
                    className="input w-full mt-1"
                  />
                </div>
                <div>
                  <label className="label">Body</label>
                  <textarea
                    value={previewBody}
                    onChange={(e) => setPreviewBody(e.target.value)}
                    rows={15}
                    className="input w-full mt-1 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Tip: Replace placeholder text in [brackets] with actual values before sending.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2">Select a template to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleUseTemplate}
            disabled={!selectedTemplate}
            className="btn-primary disabled:opacity-50"
          >
            Use Template
          </button>
        </div>
      </div>
    </div>
  )
}
