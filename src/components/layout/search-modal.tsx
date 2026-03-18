'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface SearchResult {
  id: string
  type: 'athlete' | 'brand' | 'deal'
  title: string
  subtitle: string
  href: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Search when query changes
  useEffect(() => {
    const searchAll = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      const results: SearchResult[] = []

      try {
        // Search athletes
        const { data: athletes } = await supabase
          .from('athletes')
          .select('id, name, sport, school')
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,school.ilike.%${searchQuery}%`)
          .limit(5)

        if (athletes) {
          athletes.forEach((a: { id: string; name: string; sport: string; school: string | null }) => {
            results.push({
              id: a.id,
              type: 'athlete',
              title: a.name,
              subtitle: [a.sport, a.school].filter(Boolean).join(' · '),
              href: `/athletes/${a.id}`
            })
          })
        }

        // Search brand outreach
        const { data: brands } = await supabase
          .from('brand_outreach')
          .select('id, brand_name, athlete_id, athletes!inner(name)')
          .ilike('brand_name', `%${searchQuery}%`)
          .limit(5)

        if (brands) {
          brands.forEach((b: { id: string; brand_name: string; athlete_id: string; athletes: { name: string } }) => {
            results.push({
              id: b.id,
              type: 'brand',
              title: b.brand_name,
              subtitle: `Athlete: ${b.athletes.name}`,
              href: `/athletes/${b.athlete_id}`
            })
          })
        }

        // Search financial deals
        const { data: deals } = await supabase
          .from('financial_tracking')
          .select('id, deal_name, athlete_id, athletes!inner(name)')
          .ilike('deal_name', `%${searchQuery}%`)
          .limit(5)

        if (deals) {
          deals.forEach((d: { id: string; deal_name: string; athlete_id: string; athletes: { name: string } }) => {
            results.push({
              id: d.id,
              type: 'deal',
              title: d.deal_name,
              subtitle: `Athlete: ${d.athletes.name}`,
              href: `/athletes/${d.athlete_id}`
            })
          })
        }

        setSearchResults(results)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(searchAll, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, supabase])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'athlete':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'brand':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'deal':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-[15vh]">
        <div className="relative w-full max-w-lg transform rounded-lg bg-white border border-gray-200 shadow-lg transition-all">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-100 px-4">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search athletes, brands, deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-0 bg-transparent py-4 pl-3 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
            />
            {isSearching && (
              <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-brand-600 rounded-full" />
            )}
            <button
              onClick={onClose}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Results */}
          {searchQuery.length >= 2 && (
            <div className="max-h-80 overflow-y-auto py-2">
              {searchResults.length > 0 ? (
                <ul>
                  {searchResults.map((result) => (
                    <li key={`${result.type}-${result.id}`}>
                      <Link
                        href={result.href}
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                      >
                        <span className="text-gray-400">{getTypeIcon(result.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                          <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                        </div>
                        <span className="text-xs text-gray-500 capitalize bg-gray-100 px-1.5 py-0.5 rounded">
                          {result.type}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : !isSearching ? (
                <div className="px-4 py-8 text-center">
                  <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No results found</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Keyboard hint */}
          {searchQuery.length < 2 && (
            <div className="px-4 py-3 text-center text-xs text-gray-400 border-t border-gray-100">
              Type at least 2 characters to search · Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Esc</kbd> to close
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
