'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/lib/database.types'

interface DocumentWithUser extends Document {
  users: { name: string } | null
}

interface AthleteDocumentsProps {
  athleteId: string
  initialDocuments: DocumentWithUser[]
}

const documentTypes = [
  { value: 'contract', label: 'Contract' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'nil_deal', label: 'NIL Deal' },
  { value: 'medical', label: 'Medical Record' },
  { value: 'academic', label: 'Academic Record' },
  { value: 'other', label: 'Other' },
]

export function AthleteDocuments({ athleteId, initialDocuments }: AthleteDocumentsProps) {
  const [documents, setDocuments] = useState<DocumentWithUser[]>(initialDocuments)
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedType, setSelectedType] = useState('other')
  const [notes, setNotes] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    if (fileType.includes('image')) return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
    if (fileType.includes('word') || fileType.includes('doc')) return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${athleteId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) {
        // If bucket doesn't exist, save without storage (for demo)
        console.warn('Storage upload failed, saving metadata only:', uploadError)
      }

      // Save document record
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          athlete_id: athleteId,
          uploaded_by: user.id,
          name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: fileName,
          document_type: selectedType,
          notes: notes || null,
        } as never)
        .select('*, users:uploaded_by (name)')
        .single()

      if (docError) throw docError

      setDocuments([docData as DocumentWithUser, ...documents])
      setShowUploadModal(false)
      setSelectedType('other')
      setNotes('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload document. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    const doc = documents.find(d => d.id === docId)
    if (!doc) return

    try {
      // Delete from storage
      await supabase.storage.from('documents').remove([doc.storage_path])

      // Delete record
      const { error } = await supabase.from('documents').delete().eq('id', docId)
      if (error) throw error

      setDocuments(documents.filter(d => d.id !== docId))
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete document.')
    }
  }

  const handleDownload = async (doc: DocumentWithUser) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)

      if (error) {
        alert('Document not available for download.')
        return
      }

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download document.')
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        <button onClick={() => setShowUploadModal(true)} className="btn-secondary text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Upload
        </button>
      </div>

      {documents.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <li key={doc.id} className="py-3 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(doc.file_type)} />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-500">
                    {documentTypes.find(t => t.value === doc.document_type)?.label || 'Other'} · {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-6">
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No documents uploaded yet</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Document Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="mt-1 input w-full"
                >
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 input w-full"
                  rows={2}
                  placeholder="Add any notes about this document..."
                />
              </div>

              <div>
                <label className="label">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="btn-secondary"
              >
                Cancel
              </button>
              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div>
                  Uploading...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
