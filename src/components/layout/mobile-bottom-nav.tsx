'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { bottomNavItems } from './nav-config'

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75 md:hidden">
      <nav className="mx-auto grid max-w-lg grid-cols-5 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5">
        {bottomNavItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className="group flex flex-col items-center justify-center gap-0.5 px-1 py-1.5"
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-brand-100/80 text-brand-700' : 'text-gray-500 group-active:bg-gray-100'
                }`}
              >
                <svg
                  className="h-[22px] w-[22px]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2 : 1.7} d={item.icon} />
                </svg>
              </span>
              <span
                className={`text-[10px] font-medium tracking-tight ${
                  isActive ? 'text-brand-700' : 'text-gray-500'
                }`}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
