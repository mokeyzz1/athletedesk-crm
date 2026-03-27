'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/database.types'
import { AthletePanel } from '@/components/athletes/athlete-panel'

interface AthletePanelContextType {
  openAthletePanel: (athleteId: string) => void
  closeAthletePanel: () => void
  isOpen: boolean
  selectedAthleteId: string | null
}

const AthletePanelContext = createContext<AthletePanelContextType | null>(null)

export function useAthletePanel() {
  const context = useContext(AthletePanelContext)
  if (!context) {
    throw new Error('useAthletePanel must be used within an AthletePanelProvider')
  }
  return context
}

interface AthletePanelProviderProps {
  children: React.ReactNode
}

export function AthletePanelProvider({ children }: AthletePanelProviderProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  // Fetch users for the panel
  useEffect(() => {
    async function fetchUsers() {
      const supabase = createClient()
      const { data } = await supabase.from('users').select('*')
      if (data) setUsers(data as User[])
    }
    fetchUsers()
  }, [])

  const openAthletePanel = useCallback((athleteId: string) => {
    setSelectedAthleteId(athleteId)
    setIsOpen(true)
  }, [])

  const closeAthletePanel = useCallback(() => {
    setIsOpen(false)
    setSelectedAthleteId(null)
  }, [])

  const handleAthleteUpdated = useCallback(() => {
    // Trigger a page refresh to update data
    window.location.reload()
  }, [])

  return (
    <AthletePanelContext.Provider
      value={{
        openAthletePanel,
        closeAthletePanel,
        isOpen,
        selectedAthleteId,
      }}
    >
      {children}
      <AthletePanel
        athleteId={selectedAthleteId}
        isOpen={isOpen}
        onClose={closeAthletePanel}
        users={users}
        onAthleteUpdated={handleAthleteUpdated}
      />
    </AthletePanelContext.Provider>
  )
}
