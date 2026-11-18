'use client'

import { AthletePanelProvider } from '@/contexts/athlete-panel-context'

interface DashboardProvidersProps {
  children: React.ReactNode
  sportsFocus: string[]
}

export function DashboardProviders({ children, sportsFocus }: DashboardProvidersProps) {
  return (
    <AthletePanelProvider sportsFocus={sportsFocus}>
      {children}
    </AthletePanelProvider>
  )
}
