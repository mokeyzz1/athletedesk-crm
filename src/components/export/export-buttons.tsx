'use client'

import { useState } from 'react'
import { exportToCSV, exportToExcel } from '@/lib/export'

interface ExportColumn<T> {
  key: keyof T
  header: string
}

interface ExportButtonsProps<T extends Record<string, unknown>> {
  data: T[]
  filename: string
  columns?: ExportColumn<T>[]
  sheetName?: string
}

export function ExportButtons<T extends Record<string, unknown>>({
  data,
  filename,
  columns,
  sheetName = 'Data',
}: ExportButtonsProps<T>) {
  const [isOpen, setIsOpen] = useState(false)

  const handleExportCSV = () => {
    exportToCSV(data, filename, columns)
    setIsOpen(false)
  }

  const handleExportExcel = () => {
    exportToExcel(data, filename, sheetName, columns)
    setIsOpen(false)
  }

  if (data.length === 0) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <button
                onClick={handleExportCSV}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export as CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export as Excel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
