'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'

type SortColumn = 'document' | 'athlete' | 'type' | 'date' | 'status'
type SortDirection = 'asc' | 'desc'

interface DocumentWithAthlete {
  id: string
  athlete_id: string
  name: string
  file_type: string
  file_size: number
  storage_path: string
  document_type: string
  status: string | null
  notes: string | null
  created_at: string
  athletes: { id: string; name: string } | null
  users: { name: string } | null
}

interface Athlete {
  id: string
  name: string
}

const documentTypes = [
  { value: 'contract', label: 'Contract' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'nil_deal', label: 'NIL Deal' },
  { value: 'scouting_report', label: 'Scouting Report' },
  { value: 'medical', label: 'Medical Record' },
  { value: 'academic', label: 'Academic Record' },
  { value: 'other', label: 'Other' },
]

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'badge-yellow' },
  { value: 'signed', label: 'Signed', color: 'badge-green' },
  { value: 'expired', label: 'Expired', color: 'badge-red' },
]

export default function ContractsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [documents, setDocuments] = useState<DocumentWithAthlete[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Filters
  const [athleteFilter, setAthleteFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Upload state
  const [uploadAthleteId, setUploadAthleteId] = useState('')
  const [uploadType, setUploadType] = useState('contract')
  const [uploadStatus, setUploadStatus] = useState('pending')
  const [uploadNotes, setUploadNotes] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)

    // Fetch all documents with athlete info
    const { data: docsData } = await supabase
      .from('documents')
      .select('*, athletes(id, name), users:uploaded_by(name)')
      .order('created_at', { ascending: false })

    if (docsData) {
      setDocuments(docsData as DocumentWithAthlete[])
    }

    // Fetch all athletes for filter and upload
    const { data: athletesData } = await supabase
      .from('athletes')
      .select('id, name')
      .order('name')

    if (athletesData) {
      setAthletes(athletesData as Athlete[])
    }

    setIsLoading(false)
  }

  const filteredDocuments = documents.filter(doc => {
    if (athleteFilter && doc.athlete_id !== athleteFilter) return false
    if (typeFilter && doc.document_type !== typeFilter) return false
    if (statusFilter && (doc.status || 'pending') !== statusFilter) return false
    return true
  })

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortColumn) {
        case 'document':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'athlete':
          aVal = (a.athletes?.name || '').toLowerCase()
          bVal = (b.athletes?.name || '').toLowerCase()
          break
        case 'type':
          aVal = a.document_type
          bVal = b.document_type
          break
        case 'date':
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
        case 'status':
          aVal = a.status || 'pending'
          bVal = b.status || 'pending'
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredDocuments, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => (
    sortColumn === column ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    ) : null
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
    if (fileType.includes('image')) return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
    return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadAthleteId) return

    setIsUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user's database ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('google_sso_id', user.id)
        .single() as { data: { id: string } | null }

      if (!userData) throw new Error('User not found')

      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${uploadAthleteId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) {
        console.warn('Storage upload failed, saving metadata only:', uploadError)
      }

      // Save document record
      const { error: docError } = await supabase
        .from('documents')
        .insert({
          athlete_id: uploadAthleteId,
          uploaded_by: userData.id,
          name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: fileName,
          document_type: uploadType,
          status: uploadStatus,
          notes: uploadNotes || null,
        } as never)

      if (docError) throw docError

      // Refresh data
      fetchData()
      setShowUploadModal(false)
      resetUploadForm()
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload document. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const resetUploadForm = () => {
    setUploadAthleteId('')
    setUploadType('contract')
    setUploadStatus('pending')
    setUploadNotes('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownload = async (doc: DocumentWithAthlete) => {
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

  const handleStatusChange = async (docId: string, newStatus: string) => {
    const { error } = await supabase
      .from('documents')
      .update({ status: newStatus } as never)
      .eq('id', docId)

    if (!error) {
      setDocuments(docs =>
        docs.map(d => d.id === docId ? { ...d, status: newStatus } : d)
      )
    }
  }

  const clearFilters = () => {
    setAthleteFilter('')
    setTypeFilter('')
    setStatusFilter('')
  }

  const hasActiveFilters = athleteFilter || typeFilter || statusFilter

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts & Documents</h1>
          <p className="text-gray-600">
            {filteredDocuments.length} of {documents.length} documents
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Contract
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={athleteFilter}
            onChange={(e) => setAthleteFilter(e.target.value)}
            className="input min-w-[180px]"
          >
            <option value="">All Athletes</option>
            {athletes.map(athlete => (
              <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input min-w-[160px]"
          >
            <option value="">All Types</option>
            {documentTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input min-w-[140px]"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-secondary text-sm">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Documents Table */}
      {sortedDocuments.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th onClick={() => handleSort('document')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                    <div className="flex items-center gap-1">Document <SortIcon column="document" /></div>
                  </th>
                  <th onClick={() => handleSort('athlete')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                    <div className="flex items-center gap-1">Athlete <SortIcon column="athlete" /></div>
                  </th>
                  <th onClick={() => handleSort('type')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                    <div className="flex items-center gap-1">Type <SortIcon column="type" /></div>
                  </th>
                  <th onClick={() => handleSort('date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                    <div className="flex items-center gap-1">Upload Date <SortIcon column="date" /></div>
                  </th>
                  <th onClick={() => handleSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                    <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedDocuments.map((doc) => (
                  <tr key={doc.id} className="table-row-hover">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(doc.file_type)} />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/athletes/${doc.athlete_id}`}
                        className="text-sm text-brand-600 hover:text-brand-700"
                      >
                        {doc.athletes?.name || 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={doc.status || 'pending'}
                        onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${
                          (doc.status || 'pending') === 'signed' ? 'bg-green-100 text-green-800' :
                          (doc.status || 'pending') === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {statusOptions.map(status => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-brand-600 hover:text-brand-900"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="empty-state-title">No documents found</p>
            <p className="empty-state-description">
              {hasActiveFilters
                ? 'Try adjusting your filters to find what you\'re looking for.'
                : 'Upload your first contract or document to get started.'}
            </p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="btn-secondary mt-4">
                Clear Filters
              </button>
            ) : (
              <button onClick={() => setShowUploadModal(true)} className="btn-primary mt-4">
                Upload Contract
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Contract</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Athlete *</label>
                <select
                  value={uploadAthleteId}
                  onChange={(e) => setUploadAthleteId(e.target.value)}
                  className="mt-1 input w-full"
                  required
                >
                  <option value="">Select an athlete</option>
                  {athletes.map(athlete => (
                    <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Document Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="mt-1 input w-full"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  value={uploadStatus}
                  onChange={(e) => setUploadStatus(e.target.value)}
                  className="mt-1 input w-full"
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
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
                  disabled={isUploading || !uploadAthleteId}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-gray-500">PDF, Word, or image files up to 10MB</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  resetUploadForm()
                }}
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
