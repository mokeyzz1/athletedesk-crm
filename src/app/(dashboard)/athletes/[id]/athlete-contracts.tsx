'use client'

import { useState, useEffect, useCallback } from 'react'

interface Contract {
  id: string
  title: string
  recipient_email: string
  recipient_name: string
  status: string
  sent_at: string
  signed_at: string | null
  envelope_id: string | null
}

interface AthleteContractsProps {
  athleteId: string
}

export function AthleteContracts({ athleteId }: AthleteContractsProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [hasDocuSign, setHasDocuSign] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Check if DocuSign is connected
      const intRes = await fetch('/api/integrations')
      const intData = await intRes.json()
      const dsIntegration = intData.integrations?.find(
        (i: { provider: string; is_active: boolean }) =>
          i.provider === 'docusign' && i.is_active
      )
      setHasDocuSign(!!dsIntegration)

      // Fetch contracts
      const res = await fetch(`/api/contracts?athleteId=${athleteId}`)
      const data = await res.json()
      if (data.contracts) {
        setContracts(data.contracts)
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
    }
    setLoading(false)
  }, [athleteId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      created: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sent' },
      delivered: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Delivered' },
      signed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Signed' },
      declined: { bg: 'bg-red-100', text: 'text-red-700', label: 'Declined' },
      voided: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Voided' },
    }
    const config = statusConfig[status] || statusConfig.created
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contracts</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!hasDocuSign && contracts.length === 0) {
    return null // Don't show section if DocuSign not connected and no contracts
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Contracts</h2>
        {contracts.length > 0 && (
          <span className="text-sm text-gray-500">{contracts.length} total</span>
        )}
      </div>

      {contracts.length === 0 ? (
        <div className="text-center py-6">
          <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No contracts sent yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{contract.title}</p>
                <p className="text-xs text-gray-500">
                  Sent {formatDate(contract.sent_at)} to {contract.recipient_name}
                </p>
                {contract.signed_at && (
                  <p className="text-xs text-green-600">
                    Signed on {formatDate(contract.signed_at)}
                  </p>
                )}
              </div>
              <div className="ml-3">
                {getStatusBadge(contract.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
