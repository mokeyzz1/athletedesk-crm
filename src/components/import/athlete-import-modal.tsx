'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  parseImportFile,
  mapColumns,
  normalizeAthleteData,
  athleteColumnMappings,
} from '@/lib/export'
import type { AthleteInsert, Json } from '@/lib/database.types'

interface AthleteImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  pipelineStage?: 'prospect_identified' | 'signed_client'
  title?: string
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete'

export function AthleteImportModal({ isOpen, onClose, onSuccess, pipelineStage, title }: AthleteImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([])
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)

    try {
      const data = await parseImportFile(selectedFile)
      setRawData(data)

      // Map and normalize the data
      const mapped = mapColumns(data, athleteColumnMappings)
      const normalized = normalizeAthleteData(mapped)
      setPreviewData(normalized)
      setStep('preview')
    } catch (err) {
      setError('Failed to parse file. Please ensure it\'s a valid CSV or Excel file.')
      console.error(err)
    }
  }

  const handleImport = async () => {
    setStep('importing')
    setImportProgress({ current: 0, total: previewData.length })

    let successCount = 0
    let failedCount = 0

    // Process in batches of 10
    const batchSize = 10
    for (let i = 0; i < previewData.length; i += batchSize) {
      const batch = previewData.slice(i, i + batchSize)

      const athletesToInsert: AthleteInsert[] = batch
        .filter(row => row.name && row.sport) // Must have name and sport
        .map(row => ({
          name: String(row.name),
          email: row.email ? String(row.email) : null,
          phone: row.phone ? String(row.phone) : null,
          school: row.school ? String(row.school) : null,
          sport: String(row.sport),
          position: row.position ? String(row.position) : null,
          league_level: (row.league_level as AthleteInsert['league_level']) || 'college',
          eligibility_year: row.eligibility_year as number | null,
          recruiting_status: (row.recruiting_status as AthleteInsert['recruiting_status']) || 'not_recruiting',
          transfer_portal_status: (row.transfer_portal_status as AthleteInsert['transfer_portal_status']) || 'not_in_portal',
          marketability_score: row.marketability_score as number | null,
          notes: row.notes ? String(row.notes) : null,
          social_media: row.social_media ? (row.social_media as Json) : null,
          sport_specific_stats: row.sport_specific_stats ? (row.sport_specific_stats as Json) : null,
          // New recruiting fields
          class_year: (row.class_year as AthleteInsert['class_year']) || 'n_a',
          region: row.region ? String(row.region) : null,
          outreach_status: (row.outreach_status as AthleteInsert['outreach_status']) || 'not_contacted',
        }))

      if (athletesToInsert.length > 0) {
        const { data: insertedAthletes, error } = await supabase
          .from('athletes')
          .insert(athletesToInsert as never[])
          .select('id')

        if (error) {
          failedCount += athletesToInsert.length
          console.error('Import error:', error)
        } else {
          successCount += athletesToInsert.length

          // If pipelineStage is specified, create pipeline entries for imported athletes
          if (pipelineStage && insertedAthletes && insertedAthletes.length > 0) {
            const pipelineEntries = insertedAthletes.map(athlete => ({
              athlete_id: athlete.id,
              pipeline_stage: pipelineStage,
              priority: 'medium' as const,
            }))

            const { error: pipelineError } = await supabase
              .from('recruiting_pipeline')
              .insert(pipelineEntries as never[])

            if (pipelineError) {
              console.error('Pipeline entry error:', pipelineError)
            }
          }
        }
      }

      // Count skipped rows (missing required fields)
      failedCount += batch.length - athletesToInsert.length

      setImportProgress({ current: Math.min(i + batchSize, previewData.length), total: previewData.length })
    }

    setImportResults({ success: successCount, failed: failedCount })
    setStep('complete')
  }

  const handleClose = () => {
    setStep('upload')
    setFile(null)
    setRawData([])
    setPreviewData([])
    setError(null)
    setImportProgress({ current: 0, total: 0 })
    setImportResults({ success: 0, failed: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const handleComplete = () => {
    handleClose()
    onSuccess()
  }

  if (!isOpen) return null

  const detectedColumns = rawData.length > 0 ? Object.keys(rawData[0]) : []
  const mappedColumns = detectedColumns.map(col => ({
    original: col,
    mapped: athleteColumnMappings[col.toLowerCase().trim()] || null
  }))

  // Count how many rows have social media data
  const socialMediaCount = previewData.filter(row => row.social_media && Object.keys(row.social_media as object).length > 0).length
  const sportStatsCount = previewData.filter(row => row.sport_specific_stats && Object.keys(row.sport_specific_stats as object).length > 0).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title || 'Import Athletes'}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Upload your spreadsheet</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                Upload a CSV or Excel file with athlete data. We&apos;ll automatically map common column names including social media and sport-specific stats.
              </p>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="btn-primary cursor-pointer inline-flex"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Choose File
                </label>
              </div>

              <div className="mt-8 text-left max-w-lg mx-auto space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Basic columns:</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Name', 'Email', 'Phone', 'School', 'Sport', 'Position', 'Level', 'Eligibility Year', 'Status'].map(col => (
                      <span key={col} className="badge-gray">{col}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Recruiting columns:</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Class Year', 'Region', 'Outreach Status', 'Contact Status'].map(col => (
                      <span key={col} className="badge-purple">{col}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Social media columns:</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Instagram', 'Instagram Followers', 'Twitter', 'TikTok', 'YouTube', 'NIL Valuation'].map(col => (
                      <span key={col} className="badge-blue">{col}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Sport-specific columns:</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Height', 'Weight', '40 Yard Dash', 'PPG', 'Offers', 'Hudl Link', 'UTR Rating'].map(col => (
                      <span key={col} className="badge-green">{col}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Preview Import</h3>
                    <p className="text-sm text-gray-500">
                      {previewData.length} records found in {file?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => { setStep('upload'); setFile(null); setPreviewData([]); }}
                    className="text-sm text-brand-600 hover:text-brand-700"
                  >
                    Choose different file
                  </button>
                </div>
              </div>

              {/* Data Summary */}
              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{previewData.length}</p>
                  <p className="text-sm text-gray-500">Athletes</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{socialMediaCount}</p>
                  <p className="text-sm text-gray-500">With Social Data</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{sportStatsCount}</p>
                  <p className="text-sm text-gray-500">With Sport Stats</p>
                </div>
              </div>

              {/* Column Mapping */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Column Mapping</h4>
                <div className="flex flex-wrap gap-2">
                  {mappedColumns.map(({ original, mapped }) => (
                    <div key={original} className="flex items-center gap-1 text-xs">
                      <span className="text-gray-600">{original}</span>
                      <span className="text-gray-400">→</span>
                      {mapped ? (
                        <span className="badge-green">{mapped}</span>
                      ) : (
                        <span className="badge-gray">ignored</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outreach</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.slice(0, 10).map((row, idx) => {
                        return (
                          <tr key={idx} className={!row.name || !row.sport ? 'bg-red-50' : ''}>
                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {String(row.name || '')}
                              {!row.name && <span className="text-red-500 ml-1">(required)</span>}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {String(row.sport || '')}
                              {!row.sport && <span className="text-red-500 ml-1">(required)</span>}
                            </td>
                            <td className="px-3 py-2 text-gray-700">{String(row.school || '-')}</td>
                            <td className="px-3 py-2">
                              <span className="badge-gray text-xs">
                                {String(row.class_year || 'n_a').replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-700 text-xs">
                              {String(row.region || '-')}
                            </td>
                            <td className="px-3 py-2">
                              <span className="badge-purple text-xs capitalize">
                                {String(row.outreach_status || 'not_contacted').replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                    ...and {previewData.length - 10} more records
                  </div>
                )}
              </div>

              {previewData.some(row => !row.name || !row.sport) && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
                  <strong>Note:</strong> Rows missing Name or Sport (highlighted in red) will be skipped during import.
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Importing athletes...</h3>
              <p className="mt-2 text-sm text-gray-500">
                {importProgress.current} of {importProgress.total} records processed
              </p>
              <div className="mt-4 w-64 mx-auto bg-gray-200 rounded-full h-2">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Import Complete!</h3>
              <div className="mt-4 flex justify-center gap-8">
                <div>
                  <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                  <p className="text-sm text-gray-500">Imported</p>
                </div>
                {importResults.failed > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                    <p className="text-sm text-gray-500">Skipped</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          {step === 'upload' && (
            <button onClick={handleClose} className="btn-secondary">Cancel</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={handleClose} className="btn-secondary">Cancel</button>
              <button onClick={handleImport} className="btn-primary">
                Import {previewData.filter(r => r.name && r.sport).length} Athletes
              </button>
            </>
          )}
          {step === 'complete' && (
            <button onClick={handleComplete} className="btn-primary">Done</button>
          )}
        </div>
      </div>
    </div>
  )
}
