'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { drawerNavItems, getPageTitle } from './nav-config'
import type { User } from '@/lib/database.types'

interface MobileHeaderProps {
  user: User
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
    <>
      {/* Fixed header bar - only visible on mobile */}
      <div className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75 md:hidden">
        <div className="flex h-14 items-center justify-between px-3">
          <button
            onClick={() => setIsOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors active:bg-gray-100"
            aria-label="Open navigation"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <p className="truncate text-[17px] font-semibold tracking-tight text-gray-900">
            {getPageTitle(pathname)}
          </p>

          <button
            onClick={() => setIsOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors active:bg-gray-100"
            aria-label="Open navigation"
          >
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                {initials}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Drawer backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-[84vw] max-w-sm transform flex-col overflow-hidden rounded-r-3xl bg-brand-950 shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="border-b border-brand-800/60 px-5 pb-5 pt-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                <span className="text-xs font-bold text-brand-600">AD</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AthleteDesk</p>
                <p className="text-xs text-brand-300">CRM</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-brand-300 transition-colors active:bg-brand-800"
              aria-label="Close navigation"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-brand-900/70 p-3">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.name}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-brand-300">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {drawerNavItems.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-brand-900'
                    : 'text-brand-100 active:bg-brand-900'
                }`}
              >
                <svg
                  className={`h-5 w-5 ${isActive ? 'text-brand-700' : 'text-brand-300'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="border-t border-brand-800/60 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <button
            onClick={handleSignOut}
            className="w-full rounded-xl bg-brand-900 px-3 py-3 text-left text-sm font-medium text-brand-100 transition-colors active:bg-brand-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
