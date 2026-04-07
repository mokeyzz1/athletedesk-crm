'use client'

import { useState } from 'react'

interface ApolloPerson {
  id: string
  first_name: string
  last_name: string
  name: string
  email: string
  email_status: 'verified' | 'unverified' | 'guessed' | null
  title: string | null
  linkedin_url: string | null
  city: string | null
  state: string | null
  organization?: {
    id: string
    name: string
    website_url: string | null
    linkedin_url: string | null
    industry: string | null
    estimated_num_employees: number | null
  }
  phone_numbers?: Array<{
    raw_number: string
    sanitized_number: string
    type: string
  }>
  seniority?: string
}

interface ApolloSearchModalProps {
  onClose: () => void
  onSelectContact: (contact: {
    name: string
    email: string
    title: string | null
    company: string | null
    linkedinUrl: string | null
    phone: string | null
  }) => void
}

const SENIORITY_OPTIONS = [
  { value: 'c_suite', label: 'C-Suite' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior', label: 'Senior' },
  { value: 'entry', label: 'Entry Level' },
]

export function ApolloSearchModal({ onClose, onSelectContact }: ApolloSearchModalProps) {
  const [searchMode, setSearchMode] = useState<'general' | 'company'>('general')
  const [query, setQuery] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [domain, setDomain] = useState('')
  const [selectedSeniorities, setSelectedSeniorities] = useState<string[]>([])
  const [decisionMakersOnly, setDecisionMakersOnly] = useState(false)

  const [results, setResults] = useState<ApolloPerson[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [hasApollo, setHasApollo] = useState<boolean | null>(null)

  // Check Apollo connection on mount
  useState(() => {
    checkConnection()
  })

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/integrations')
      const data = await res.json()
      const apolloIntegration = data.integrations?.find(
        (i: { provider: string; is_active: boolean }) =>
          i.provider === 'apollo' && i.is_active
      )
      setHasApollo(!!apolloIntegration)
    } catch {
      setHasApollo(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSearched(true)

    try {
      const res = await fetch('/api/apollo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchMode === 'general' ? query : undefined,
          companyName: searchMode === 'company' ? companyName : undefined,
          domain: searchMode === 'company' && domain ? domain : undefined,
          seniorities: selectedSeniorities.length > 0 ? selectedSeniorities : undefined,
          decisionMakersOnly: searchMode === 'company' && decisionMakersOnly,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data.people || [])
      setTotalCount(data.totalCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectContact = (person: ApolloPerson) => {
    onSelectContact({
      name: person.name,
      email: person.email,
      title: person.title,
      company: person.organization?.name || null,
      linkedinUrl: person.linkedin_url,
      phone: person.phone_numbers?.[0]?.raw_number || null,
    })
    onClose()
  }

  const toggleSeniority = (value: string) => {
    setSelectedSeniorities(prev =>
      prev.includes(value)
        ? prev.filter(s => s !== value)
        : [...prev, value]
    )
  }

  const getEmailStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified':
        return <span className="ml-1 text-xs text-green-600">✓</span>
      case 'guessed':
        return <span className="ml-1 text-xs text-yellow-600">~</span>
      default:
        return null
    }
  }

  if (hasApollo === null) {
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
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Search Apollo</h3>
              <p className="text-sm text-gray-500">Find brand contacts and decision makers</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!hasApollo ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Apollo</h4>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">
              Connect your Apollo account to search for brand contacts and enrich your outreach data.
            </p>
            <button
              onClick={() => window.location.href = '/settings'}
              className="btn-primary"
            >
              Go to Settings
            </button>
          </div>
        ) : (
          <>
            {/* Search Form */}
            <div className="p-4 border-b border-gray-200">
              {/* Mode Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSearchMode('general')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    searchMode === 'general'
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  General Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('company')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    searchMode === 'company'
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Find at Company
                </button>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                {searchMode === 'general' ? (
                  <div>
                    <label className="label">Search Keywords</label>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g., Marketing Director Nike"
                      className="input w-full mt-1"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Company Name</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g., Nike"
                          className="input w-full mt-1"
                        />
                      </div>
                      <div>
                        <label className="label">Domain (optional)</label>
                        <input
                          type="text"
                          value={domain}
                          onChange={(e) => setDomain(e.target.value)}
                          placeholder="e.g., nike.com"
                          className="input w-full mt-1"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={decisionMakersOnly}
                        onChange={(e) => setDecisionMakersOnly(e.target.checked)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">Decision makers only (VP+)</span>
                    </label>
                  </>
                )}

                {/* Seniority Filters */}
                <div>
                  <label className="label mb-2">Filter by Seniority</label>
                  <div className="flex flex-wrap gap-2">
                    {SENIORITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleSeniority(option.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                          selectedSeniorities.includes(option.value)
                            ? 'bg-brand-100 border-brand-300 text-brand-700'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (searchMode === 'general' && !query) || (searchMode === 'company' && !companyName && !domain)}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search Contacts
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {searched && !loading && (
                <>
                  <div className="text-sm text-gray-500 mb-3">
                    {totalCount > 0
                      ? `Found ${totalCount.toLocaleString()} contact${totalCount !== 1 ? 's' : ''}`
                      : 'No contacts found'}
                  </div>

                  {results.length > 0 && (
                    <div className="space-y-2">
                      {results.map((person) => (
                        <div
                          key={person.id}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-gray-900">{person.name}</h4>
                                {person.linkedin_url && (
                                  <a
                                    href={person.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                  </a>
                                )}
                              </div>
                              {person.title && (
                                <p className="text-sm text-gray-600">{person.title}</p>
                              )}
                              {person.organization?.name && (
                                <p className="text-sm text-gray-500">{person.organization.name}</p>
                              )}
                              {person.email && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {person.email}
                                  {getEmailStatusBadge(person.email_status)}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                {person.city && person.state && (
                                  <span>{person.city}, {person.state}</span>
                                )}
                                {person.seniority && (
                                  <span className="capitalize">{person.seniority.replace(/_/g, ' ')}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleSelectContact(person)}
                              className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
                            >
                              Use Contact
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!searched && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm">Search for contacts to find brand partners</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
