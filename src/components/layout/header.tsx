'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { User } from '@/lib/database.types'

interface HeaderProps {
  user: User
}

interface SearchResult {
  id: string
  type: 'athlete' | 'brand' | 'deal'
  title: string
  subtitle: string
  href: string
}

interface Notification {
  id: string
  type: 'followup_overdue' | 'followup_today' | 'pending_contract'
  title: string
  subtitle: string
  href: string
  date?: string
}

export function Header({ user }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Hide search on athletes page (it has its own search)
  const showSearch = pathname !== '/athletes'

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const notifs: Notification[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      try {
        // Get overdue follow-ups
        const { data: overdueFollowups } = await supabase
          .from('communications_log')
          .select('id, subject, follow_up_date, athletes(id, name)')
          .eq('follow_up_completed', false)
          .lt('follow_up_date', todayStr)
          .order('follow_up_date', { ascending: true })
          .limit(5)

        if (overdueFollowups) {
          overdueFollowups.forEach((f: { id: string; subject: string | null; follow_up_date: string; athletes: { id: string; name: string } | null }) => {
            notifs.push({
              id: `overdue-${f.id}`,
              type: 'followup_overdue',
              title: f.athletes?.name || 'Unknown',
              subtitle: f.subject || 'Follow-up overdue',
              href: `/athletes/${f.athletes?.id}`,
              date: f.follow_up_date
            })
          })
        }

        // Get today's follow-ups
        const { data: todayFollowups } = await supabase
          .from('communications_log')
          .select('id, subject, follow_up_date, athletes(id, name)')
          .eq('follow_up_completed', false)
          .eq('follow_up_date', todayStr)
          .limit(5)

        if (todayFollowups) {
          todayFollowups.forEach((f: { id: string; subject: string | null; follow_up_date: string; athletes: { id: string; name: string } | null }) => {
            notifs.push({
              id: `today-${f.id}`,
              type: 'followup_today',
              title: f.athletes?.name || 'Unknown',
              subtitle: f.subject || 'Follow-up due today',
              href: `/athletes/${f.athletes?.id}`,
              date: f.follow_up_date
            })
          })
        }

        // Get pending contracts
        const { data: pendingContracts } = await supabase
          .from('documents')
          .select('id, name, athlete_id, athletes(name)')
          .eq('status', 'pending')
          .in('document_type', ['contract', 'agreement', 'nil_deal'])
          .limit(5)

        if (pendingContracts) {
          pendingContracts.forEach((c: { id: string; name: string; athlete_id: string; athletes: { name: string } | null }) => {
            notifs.push({
              id: `contract-${c.id}`,
              type: 'pending_contract',
              title: c.name,
              subtitle: `${c.athletes?.name || 'Unknown'} - awaiting signature`,
              href: `/contracts`
            })
          })
        }

        setNotifications(notifs)
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    fetchNotifications()
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [supabase])

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
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'brand':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'deal':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
        >
          <span className="sr-only">Open menu</span>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search - hidden on athletes page */}
        {showSearch ? (
          <div className="flex-1 max-w-lg mx-4" ref={searchRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {isSearching ? (
                  <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-brand-600 rounded-full" />
                ) : (
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <input
                type="text"
                placeholder="Search athletes, brands, deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              />

              {/* Search Results Dropdown */}
              {showResults && searchQuery.length >= 2 && (
                <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <ul className="py-1">
                      {searchResults.map((result) => (
                        <li key={`${result.type}-${result.id}`}>
                          <Link
                            href={result.href}
                            onClick={() => {
                              setShowResults(false)
                              setSearchQuery('')
                            }}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
                          >
                            <span className="text-gray-400">{getTypeIcon(result.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                              <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                            </div>
                            <span className="text-xs text-gray-400 capitalize">{result.type}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : !isSearching ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No results found for &quot;{searchQuery}&quot;
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-full relative"
            >
              <span className="sr-only">View notifications</span>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notif) => (
                        <Link
                          key={notif.id}
                          href={notif.href}
                          onClick={() => setIsNotificationsOpen(false)}
                          className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-50"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1.5 rounded-full ${
                              notif.type === 'followup_overdue' ? 'bg-red-100 text-red-600' :
                              notif.type === 'followup_today' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {notif.type === 'pending_contract' ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                              <p className="text-xs text-gray-500 truncate">{notif.subtitle}</p>
                              {notif.date && (
                                <p className={`text-xs mt-0.5 ${
                                  notif.type === 'followup_overdue' ? 'text-red-600 font-medium' : 'text-gray-400'
                                }`}>
                                  {notif.type === 'followup_overdue' ? 'Overdue: ' : ''}
                                  {new Date(notif.date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">All caught up!</p>
                    </div>
                  )}
                  {notifications.length > 0 && (
                    <Link
                      href="/communications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="block px-4 py-2 text-center text-sm text-brand-600 hover:text-brand-700 font-medium border-t border-gray-100"
                    >
                      View all communications
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-3 focus:outline-none"
            >
              {user.avatar_url ? (
                <img
                  className="h-8 w-8 rounded-full"
                  src={user.avatar_url}
                  alt={user.name}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
              )}
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <a
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </a>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
