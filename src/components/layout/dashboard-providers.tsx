'use client'

import { AthletePanelProvider } from '@/contexts/athlete-panel-context'

interface DashboardProvidersProps {
  children: React.ReactNode
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <AthletePanelProvider>
      {children}
    </AthletePanelProvider>
  )
}
