'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/database.types'
import { SearchModal } from './search-modal'

interface Notification {
  id: string
  type: 'followup_overdue' | 'followup_today' | 'pending_contract' | 'mention'
  title: string
  subtitle: string
  href: string
  date?: string
  avatarUrl?: string
}

const navigationGroups = [
  {
    label: null,
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      },
    ],
  },
  {
    label: 'Athletes',
    items: [
      {
        name: 'Athletes',
        href: '/athletes',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      },
      {
        name: 'Pipeline',
        href: '/pipeline',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
      {
        name: 'Contracts',
        href: '/contracts',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      },
    ],
  },
  {
    label: 'Revenue',
    items: [
      {
        name: 'Brand Outreach',
        href: '/brands',
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      },
      {
        name: 'Financials',
        href: '/financials',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      },
    ],
  },
  {
    label: 'Team',
    items: [
      {
        name: 'Communications',
        href: '/communications',
        icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      },
      {
        name: 'Tasks',
        href: '/tasks',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      },
    ],
  },
]

interface SidebarProps {
  user: User
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [taskCount, setTaskCount] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
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

        // Fetch task count and mentions (due today or overdue, assigned to current user, not done)
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('google_sso_id', (await supabase.auth.getUser()).data.user?.id || '')
          .single()

        if (userData) {
          const { count } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', userData.id)
            .neq('status', 'done')
            .lte('due_date', todayStr)

          setTaskCount(count || 0)

          // Fetch unread mentions
          const { data: mentions } = await supabase
            .from('comment_mentions')
            .select(`
              id,
              created_at,
              comment:comment_id(
                id,
                content,
                task:task_id(id, title),
                author:author_id(name, avatar_url)
              )
            `)
            .eq('mentioned_user_id', userData.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(5)

          if (mentions) {
            mentions.forEach((mention: {
              id: string
              created_at: string
              comment: {
                id: string
                content: string
                task: { id: string; title: string } | null
                author: { name: string; avatar_url: string | null } | null
              } | null
            }) => {
              if (mention.comment && mention.comment.task) {
                notifs.push({
                  id: `mention-${mention.id}`,
                  type: 'mention',
                  title: `${mention.comment.author?.name || 'Someone'} mentioned you`,
                  subtitle: `in "${mention.comment.task.title}"`,
                  href: `/tasks/${mention.comment.task.id}`,
                  date: mention.created_at,
                  avatarUrl: mention.comment.author?.avatar_url || undefined
                })
              }
            })
          }
        }

        setNotifications(notifs)
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [supabase])

  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-shrink-0">
        <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
          <div className="flex flex-col h-full bg-brand-900">
            {/* Logo + Icon Row */}
            <div className="flex-shrink-0 bg-brand-950">
              {/* Logo */}
              <div className="flex items-center justify-center h-12 px-3">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-600 font-bold text-sm">AD</span>
                  </div>
                  {!isCollapsed && (
                    <span className="text-white font-semibold text-lg whitespace-nowrap">AthleteDesk</span>
                  )}
                </div>
              </div>

              {/* Icon Row */}
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 pb-2`}>
              {/* Search */}
              {!isCollapsed && (
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="p-2 rounded-md text-brand-300 hover:text-white hover:bg-brand-800 transition-colors"
                  title="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}

              {/* Notifications */}
              {!isCollapsed && (
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-md text-brand-300 hover:text-white hover:bg-brand-800 transition-colors relative"
                    title="Notifications"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {notifications.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {notifications.length > 9 ? '9+' : notifications.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                  <div className="absolute left-full ml-2 top-0 w-80 rounded bg-white border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    </div>
                    {notifications.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((notif) => (
                          <Link
                            key={notif.id}
                            href={notif.href}
                            onClick={() => {
                              setShowNotifications(false)
                              // Mark mention as read when clicked
                              if (notif.type === 'mention') {
                                const mentionId = notif.id.replace('mention-', '')
                                supabase
                                  .from('comment_mentions')
                                  .update({ is_read: true })
                                  .eq('id', mentionId)
                                  .then(() => {
                                    setNotifications(prev => prev.filter(n => n.id !== notif.id))
                                  })
                              }
                            }}
                            className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-50"
                          >
                            <div className="flex items-start gap-3">
                              {notif.type === 'mention' && notif.avatarUrl ? (
                                <img
                                  src={notif.avatarUrl}
                                  alt=""
                                  className="h-8 w-8 rounded-full mt-0.5"
                                />
                              ) : (
                                <div className={`mt-0.5 p-1.5 rounded ${
                                  notif.type === 'followup_overdue' ? 'bg-red-50 text-red-600' :
                                  notif.type === 'followup_today' ? 'bg-yellow-50 text-yellow-600' :
                                  notif.type === 'mention' ? 'bg-brand-50 text-brand-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {notif.type === 'pending_contract' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  ) : notif.type === 'mention' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </div>
                              )}
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
                  </div>
                )}
                </div>
              )}

              {/* Settings */}
              {!isCollapsed && (
                <Link
                  href="/settings"
                  className={`p-2 rounded-md transition-colors ${
                    pathname === '/settings'
                      ? 'text-white bg-brand-800'
                      : 'text-brand-300 hover:text-white hover:bg-brand-800'
                  }`}
                  title="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              )}

              {/* Collapse Toggle */}
              <button
                onClick={toggleCollapsed}
                className="p-2 rounded-md text-brand-300 hover:text-white hover:bg-brand-800 transition-colors"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isCollapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7M19 19l-7-7 7-7'}
                  />
                </svg>
              </button>
            </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-4">
                {navigationGroups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {group.label && !isCollapsed && (
                      <p className="px-2 mb-2 text-xs font-semibold text-brand-400 uppercase tracking-wider">
                        {group.label}
                      </p>
                    )}
                    {group.label && isCollapsed && (
                      <div className="border-t border-brand-700 my-2 mx-2" />
                    )}
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = pathname.startsWith(item.href)
                        const showBadge = item.name === 'Tasks' && taskCount > 0
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            title={isCollapsed ? item.name : undefined}
                            className={`group flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-2'} py-2 text-sm font-medium rounded-md transition-colors ${
                              isActive
                                ? 'bg-brand-800 text-white'
                                : 'text-brand-100 hover:bg-brand-800 hover:text-white'
                            }`}
                          >
                            <div className="relative">
                              <svg
                                className={`h-5 w-5 flex-shrink-0 ${
                                  isActive ? 'text-white' : 'text-brand-300 group-hover:text-white'
                                } ${!isCollapsed ? 'mr-3' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d={item.icon}
                                />
                              </svg>
                              {isCollapsed && showBadge && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                  {taskCount > 9 ? '9+' : taskCount}
                                </span>
                              )}
                            </div>
                            {!isCollapsed && (
                              <>
                                <span className="flex-1">{item.name}</span>
                                {showBadge && (
                                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {taskCount > 9 ? '9+' : taskCount}
                                  </span>
                                )}
                              </>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            {/* User Profile */}
            <div className="flex-shrink-0 border-t border-brand-700 p-3">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : ''} rounded-md hover:bg-brand-800 p-2 transition-colors`}
                  title={isCollapsed ? user.name : undefined}
                >
                  <img
                    className="h-8 w-8 rounded-full flex-shrink-0"
                    src={user.avatar_url || ''}
                    alt={user.name}
                  />
                  {!isCollapsed && (
                    <div className="ml-3 text-left flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.name}</p>
                      <p className="text-xs text-brand-300 truncate">{user.email}</p>
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className={`absolute ${isCollapsed ? 'left-full ml-2 bottom-0' : 'left-0 right-0 bottom-full mb-2'} bg-white rounded border border-gray-200 z-50`}>
                    <div className="py-1">
                      {isCollapsed && (
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      )}
                      <Link
                        href="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Settings
                      </Link>
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
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </>
  )
}
