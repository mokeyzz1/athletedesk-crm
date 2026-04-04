'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, RosterTeam } from '@/lib/database.types'
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
  const [rosterTeams, setRosterTeams] = useState<RosterTeam[]>([])

  // Fetch users and roster teams for the panel
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const [usersResult, teamsResult] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('roster_teams').select('*').order('name')
      ])
      if (usersResult.data) setUsers(usersResult.data as User[])
      if (teamsResult.data) setRosterTeams(teamsResult.data as RosterTeam[])
    }
    fetchData()
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
        rosterTeams={rosterTeams}
        onAthleteUpdated={handleAthleteUpdated}
      />
    </AthletePanelContext.Provider>
  )
}
