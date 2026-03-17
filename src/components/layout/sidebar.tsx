'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@/lib/database.types'

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
    ],
  },
  {
    label: 'Account',
    items: [
      {
        name: 'Settings',
        href: '/settings',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      },
    ],
  },
]

interface SidebarProps {
  user: User
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      agent: 'bg-blue-100 text-blue-700',
      scout: 'bg-green-100 text-green-700',
      marketing: 'bg-purple-100 text-purple-700',
      intern: 'bg-gray-100 text-gray-700',
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex flex-col h-0 flex-1 bg-brand-900">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 flex-shrink-0 px-3 bg-brand-950">
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-brand-600 font-bold text-sm">AD</span>
              </div>
              {!isCollapsed && (
                <span className="text-white font-semibold text-lg whitespace-nowrap">AthleteDesk</span>
              )}
            </div>
            <button
              onClick={toggleCollapsed}
              className="p-1.5 rounded-md text-brand-300 hover:text-white hover:bg-brand-800 transition-colors"
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
                          {!isCollapsed && item.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* User Profile */}
          <div className="flex-shrink-0 flex bg-brand-800 p-3">
            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'w-full'}`}>
              <div className="flex-shrink-0">
                {user.avatar_url ? (
                  <img
                    className={`rounded-full ${isCollapsed ? 'h-8 w-8' : 'h-10 w-10'}`}
                    src={user.avatar_url}
                    alt={user.name}
                    title={isCollapsed ? `${user.name} (${user.role})` : undefined}
                  />
                ) : (
                  <div
                    className={`rounded-full bg-brand-600 flex items-center justify-center ${isCollapsed ? 'h-8 w-8' : 'h-10 w-10'}`}
                    title={isCollapsed ? `${user.name} (${user.role})` : undefined}
                  >
                    <span className={`text-white font-medium ${isCollapsed ? 'text-xs' : ''}`}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
