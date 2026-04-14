'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  parseImportFile,
  mapColumns,
  normalizeAthleteData,
  athleteColumnMappings,
  type ParsedWorkbook,
} from '@/lib/export'
import type { AthleteInsert, Json } from '@/lib/database.types'

interface AthleteImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  pipelineStage?: 'prospect_identified' | 'signed_client'
  title?: string
}

type ImportStep = 'upload' | 'select-type' | 'select-sheet' | 'preview' | 'importing' | 'complete'
type ImportType = 'recruiting' | 'roster'

const SPORTS = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Track & Field',
  'Swimming', 'Tennis', 'Golf', 'Volleyball', 'Softball',
  'Hockey', 'Lacrosse', 'Wrestling', 'Gymnastics', 'Other'
]

export function AthleteImportModal({ isOpen, onClose, onSuccess, pipelineStage, title }: AthleteImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([])
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([])
  const [skippedRows, setSkippedRows] = useState<{ row: number; reason: string; value: string }[]>([])
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set())
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [selectedSport, setSelectedSport] = useState<string>('Football')
  const [importType, setImportType] = useState<ImportType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, duplicatesSkipped: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)

    try {
      const parsed = await parseImportFile(selectedFile)
      setWorkbook(parsed)

      // If pipelineStage is already set (from props), use it to determine import type
      if (pipelineStage === 'signed_client') {
        setImportType('roster')
        if (parsed.sheetNames.length === 1) {
          const sheetName = parsed.sheetNames[0]
          setSelectedSheet(sheetName)
          await processSheet(parsed.sheets[sheetName])
        } else {
          setStep('select-sheet')
        }
      } else if (pipelineStage === 'prospect_identified') {
        setImportType('recruiting')
        if (parsed.sheetNames.length === 1) {
          const sheetName = parsed.sheetNames[0]
          setSelectedSheet(sheetName)
          await processSheet(parsed.sheets[sheetName])
        } else {
          setStep('select-sheet')
        }
      } else {
        // Ask user what type of import
        setStep('select-type')
      }
    } catch (err) {
      setError('Failed to parse file. Please ensure it\'s a valid CSV or Excel file.')
      console.error(err)
    }
  }

  const handleTypeSelect = async (type: ImportType) => {
    setImportType(type)
    if (workbook) {
      if (workbook.sheetNames.length === 1) {
        const sheetName = workbook.sheetNames[0]
        setSelectedSheet(sheetName)
        await processSheet(workbook.sheets[sheetName])
      } else {
        setStep('select-sheet')
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) await processFile(selectedFile)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) await processFile(droppedFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const processSheet = async (data: Record<string, unknown>[]) => {
    setRawData(data)
    const mapped = mapColumns(data, athleteColumnMappings)
    const result = normalizeAthleteData(mapped)
    setPreviewData(result.data)
    setSkippedRows(result.skippedRows)

    // Check for duplicates against existing athletes
    await checkForDuplicates(result.data)

    setStep('preview')
  }

  const checkForDuplicates = async (data: Record<string, unknown>[]) => {
    const duplicateIndices = new Set<number>()

    // Get all emails and names from the import data
    const emails = data
      .map((row, idx) => ({ email: row.email ? String(row.email).toLowerCase().trim() : null, idx }))
      .filter(item => item.email)
    const names = data
      .map((row, idx) => ({ name: row.name ? String(row.name).toLowerCase().trim() : null, idx }))
      .filter(item => item.name)

    // Check emails in batches
    if (emails.length > 0) {
      const emailValues = emails.map(e => e.email as string)
      const { data: existingByEmail } = await supabase
        .from('athletes')
        .select('email')
        .not('email', 'is', null)

      if (existingByEmail) {
        const existingEmails = new Set(
          (existingByEmail as { email: string }[]).map(a => a.email?.toLowerCase().trim())
        )
        emails.forEach(({ email, idx }) => {
          if (email && existingEmails.has(email)) {
            duplicateIndices.add(idx)
          }
        })
      }
    }

    // Check names in batches
    if (names.length > 0) {
      const { data: existingByName } = await supabase
        .from('athletes')
        .select('name')

      if (existingByName) {
        const existingNames = new Set(
          (existingByName as { name: string }[]).map(a => a.name?.toLowerCase().trim())
        )
        names.forEach(({ name, idx }) => {
          if (name && existingNames.has(name)) {
            duplicateIndices.add(idx)
          }
        })
      }
    }

    setDuplicates(duplicateIndices)
  }

  const handleSheetSelect = async (sheetName: string) => {
    if (!workbook) return
    setSelectedSheet(sheetName)
    const dataWithSheet = workbook.sheets[sheetName].map(row => ({
      ...row,
      _sourceSheet: sheetName
    }))
    await processSheet(dataWithSheet)
  }

  const handleImportAllSheets = async () => {
    if (!workbook) return
    const allData: Record<string, unknown>[] = []
    workbook.sheetNames.forEach(sheetName => {
      const sheetData = workbook.sheets[sheetName]
      sheetData.forEach(row => {
        allData.push({ ...row, _sourceSheet: sheetName })
      })
    })
    setSelectedSheet('All Sheets')
    await processSheet(allData)
  }

  const handleImport = async () => {
    setStep('importing')

    // Filter out duplicates if skip is enabled
    const dataToImport = skipDuplicates
      ? previewData.filter((_, idx) => !duplicates.has(idx))
      : previewData

    const duplicatesSkipped = skipDuplicates ? duplicates.size : 0

    setImportProgress({ current: 0, total: dataToImport.length })

    const uniqueRegions = Array.from(new Set(
      previewData
        .map(row => row.region ? String(row.region) : null)
        .filter((r): r is string => r !== null && r.trim() !== '')
    ))

    if (uniqueRegions.length > 0) {
      const { data: existingRegions } = await supabase
        .from('recruiting_regions')
        .select('name')

      const existingNames = new Set((existingRegions as { name: string }[] || []).map(r => r.name))
      const newRegions = uniqueRegions.filter(r => !existingNames.has(r))

      if (newRegions.length > 0) {
        await supabase
          .from('recruiting_regions')
          .insert(newRegions.map(name => ({ name, states: [] })) as never[])
      }
    }

    let successCount = 0
    let failedCount = 0

    const batchSize = 10
    for (let i = 0; i < dataToImport.length; i += batchSize) {
      const batch = dataToImport.slice(i, i + batchSize)

      const isRosterImport = importType === 'roster' || pipelineStage === 'signed_client'

      const athletesToInsert: AthleteInsert[] = batch
        .filter(row => row.name)
        .map(row => ({
          name: String(row.name),
          email: row.email ? String(row.email) : null,
          phone: row.phone ? String(row.phone) : null,
          school: row.school ? String(row.school) : null,
          sport: row.sport ? String(row.sport) : selectedSport,
          position: row.position ? String(row.position) : null,
          league_level: (row.league_level as AthleteInsert['league_level']) || 'college',
          eligibility_year: row.eligibility_year as number | null,
          recruiting_status: (row.recruiting_status as AthleteInsert['recruiting_status']) || 'not_recruiting',
          transfer_portal_status: (row.transfer_portal_status as AthleteInsert['transfer_portal_status']) || 'not_in_portal',
          marketability_score: row.marketability_score as number | null,
          notes: row.notes ? String(row.notes) : null,
          social_media: row.social_media ? (row.social_media as Json) : null,
          sport_specific_stats: row.sport_specific_stats ? (row.sport_specific_stats as Json) : null,
          class_year: (row.class_year as AthleteInsert['class_year']) || 'n_a',
          region: row.region ? String(row.region) : null,
          outreach_status: isRosterImport
            ? 'signed'
            : (row.outreach_status as AthleteInsert['outreach_status']) || 'not_contacted',
          // Roster profile fields
          birthday: isRosterImport && row.birthday ? String(row.birthday) : null,
          hometown: isRosterImport && row.hometown ? String(row.hometown) : null,
          mailing_address: isRosterImport && row.mailing_address ? String(row.mailing_address) : null,
          interests: isRosterImport && row.interests ? String(row.interests) : null,
          dream_partnership: isRosterImport && row.dream_partnership ? String(row.dream_partnership) : null,
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

          const effectivePipelineStage = pipelineStage || (importType === 'roster' ? 'signed_client' : 'prospect_identified')
          if (insertedAthletes && insertedAthletes.length > 0) {
            const typedInsertedAthletes = insertedAthletes as { id: string }[]
            const pipelineEntries = typedInsertedAthletes.map(athlete => ({
              athlete_id: athlete.id,
              pipeline_stage: effectivePipelineStage,
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

      failedCount += batch.length - athletesToInsert.length
      setImportProgress({ current: Math.min(i + batchSize, dataToImport.length), total: dataToImport.length })
    }

    setImportResults({ success: successCount, failed: failedCount, duplicatesSkipped })
    setStep('complete')
  }

  const handleClose = () => {
    setStep('upload')
    setFile(null)
    setWorkbook(null)
    setSelectedSheet('')
    setRawData([])
    setPreviewData([])
    setSkippedRows([])
    setDuplicates(new Set())
    setSkipDuplicates(true)
    setSelectedSport('Football')
    setImportType(null)
    setError(null)
    setImportProgress({ current: 0, total: 0 })
    setImportResults({ success: 0, failed: 0, duplicatesSkipped: 0 })
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

  const validCount = previewData.filter(r => r.name).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title || 'Import Athletes'}</h2>
            {file && step !== 'upload' && (
              <p className="text-sm text-gray-500 mt-0.5">{file.name}</p>
            )}
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="p-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
                  ${isDragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>

                <p className="text-gray-900 font-medium">
                  Drop a file here, or <span className="text-brand-600">browse</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">CSV, XLS, or XLSX</p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 text-sm text-gray-500">
                <p className="font-medium text-gray-700 mb-2">Supported columns:</p>
                <p>Name, Email, Phone, School, Sport, Position, Class Year, Region, Status, Instagram, Twitter, Height, Weight, and more.</p>
              </div>
            </div>
          )}

          {/* Type Selection */}
          {step === 'select-type' && (
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                What type of data are you importing?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleTypeSelect('recruiting')}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 group-hover:text-brand-700">Recruiting</p>
                      <p className="text-sm text-gray-500">
                        Prospects you&apos;re trying to sign
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect('roster')}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 group-hover:text-brand-700">Roster</p>
                      <p className="text-sm text-gray-500">
                        Athletes already signed with your agency
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Sheet Selection */}
          {step === 'select-sheet' && workbook && (
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                This file has {workbook.sheetNames.length} sheets. Select which to import.
              </p>

              <button
                onClick={handleImportAllSheets}
                className="w-full p-4 mb-6 text-left bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Import all sheets</p>
                    <p className="text-sm text-gray-500">
                      {workbook.sheetNames.reduce((t, n) => t + workbook.sheets[n].length, 0)} total rows from {workbook.sheetNames.length} sheets
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Or select a sheet</p>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {workbook.sheetNames.map((sheetName) => {
                  const sheetData = workbook.sheets[sheetName]
                  const rowCount = sheetData.length
                  const columns = rowCount > 0 ? Object.keys(sheetData[0]) : []
                  // Get first 3 names as preview
                  const sampleNames = sheetData
                    .slice(0, 3)
                    .map(row => {
                      const nameCol = columns.find(c => c.toLowerCase().includes('name'))
                      return nameCol ? String(row[nameCol] || '') : ''
                    })
                    .filter(Boolean)

                  return (
                    <button
                      key={sheetName}
                      onClick={() => handleSheetSelect(sheetName)}
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{sheetName}</p>
                            <span className="text-xs text-gray-400">{rowCount} rows</span>
                          </div>

                          {sampleNames.length > 0 && (
                            <p className="text-sm text-gray-500 mt-1 truncate">
                              {sampleNames.join(', ')}{rowCount > 3 ? `, +${rowCount - 3} more` : ''}
                            </p>
                          )}

                          {columns.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {columns.slice(0, 5).map(col => (
                                <span key={col} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  {col}
                                </span>
                              ))}
                              {columns.length > 5 && (
                                <span className="text-xs text-gray-400">+{columns.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-gray-400 ml-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Preview */}
          {step === 'preview' && (
            <div className="p-6">
              {/* Sport Selection */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">Sport</p>
                  <p className="text-xs text-gray-500">Applied to athletes without a sport</p>
                </div>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                >
                  {SPORTS.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>

              {/* Summary */}
              <div className="mb-4 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{validCount}</span> athletes ready to import
                {selectedSheet && selectedSheet !== 'All Sheets' && (
                  <span className="text-gray-400 ml-2">from {selectedSheet}</span>
                )}
              </div>

              {/* Duplicate Warning */}
              {duplicates.size > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          {duplicates.size} duplicate{duplicates.size > 1 ? 's' : ''} found
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Athletes with matching name or email already exist
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="h-4 w-4 text-brand-600 focus:ring-brand-500 rounded"
                      />
                      <span className="text-xs text-amber-800">Skip duplicates</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Column Mapping (collapsed by default) */}
              <details className="mb-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  View column mapping ({mappedColumns.filter(c => c.mapped).length} matched)
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                  {mappedColumns.map(({ original, mapped }) => (
                    <div key={original} className="flex items-center gap-2">
                      <span className="text-gray-600">{original}</span>
                      <span className="text-gray-400">→</span>
                      <span className={mapped ? 'text-gray-900' : 'text-gray-400'}>{mapped || 'skipped'}</span>
                    </div>
                  ))}
                </div>
              </details>

              {/* Data Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">School</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Class</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Region</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewData.slice(0, 8).map((row, idx) => (
                        <tr key={idx} className={!row.name ? 'bg-red-50' : duplicates.has(idx) ? 'bg-amber-50' : ''}>
                          <td className="px-3 py-2 text-gray-900">
                            {String(row.name || '—')}
                            {!row.name && <span className="ml-1 text-xs text-red-500">(missing)</span>}
                            {duplicates.has(idx) && <span className="ml-1 text-xs text-amber-600">(duplicate)</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{String(row.school || '—')}</td>
                          <td className="px-3 py-2 text-gray-600">{String(row.class_year || '—').replace(/_/g, "'")}</td>
                          <td className="px-3 py-2 text-gray-600">{String(row.region || '—')}</td>
                          <td className="px-3 py-2 text-gray-600 capitalize">{String(row.outreach_status || '—').replace(/_/g, ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 8 && (
                  <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t">
                    +{previewData.length - 8} more
                  </div>
                )}
              </div>

              {/* Warnings */}
              {skippedRows.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  {skippedRows.length} header rows skipped (state names like {skippedRows[0]?.value})
                </p>
              )}
            </div>
          )}

          {/* Importing */}
          {step === 'importing' && (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-900 font-medium">Importing...</p>
              <p className="text-sm text-gray-500 mt-1">
                {importProgress.current} of {importProgress.total}
              </p>
              <div className="mt-4 max-w-xs mx-auto h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium">Import complete</p>
              <p className="text-sm text-gray-500 mt-1">
                {importResults.success} imported
                {importResults.duplicatesSkipped > 0 && <span>, {importResults.duplicatesSkipped} duplicates skipped</span>}
                {importResults.failed > 0 && <span>, {importResults.failed} failed</span>}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          {step !== 'importing' && step !== 'complete' && (
            <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
              Cancel
            </button>
          )}
          {step === 'preview' && (
            <button
              onClick={handleImport}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Import {skipDuplicates ? validCount - duplicates.size : validCount} athletes
            </button>
          )}
          {step === 'complete' && (
            <button
              onClick={handleComplete}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
