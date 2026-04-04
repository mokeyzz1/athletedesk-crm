'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { REGIONS } from '@/lib/database.types'

interface StaffProductivity {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string | null
  assigned_regions: string[]
  emailsThisWeek: number
  emailsThisMonth: number
  emailsAllTime: number
  commsThisWeek: number
  commsThisMonth: number
  commsAllTime: number
  tasksCompleted: number
  tasksPending: number
  tasksOverdue: number
  athletesManaged: number
  contactedThisWeek: number
}

interface AssignedAthlete {
  id: string
  name: string
  sport: string
  role: string
}

interface AthleteForAssignment {
  id: string
  name: string
  sport: string
  assigned_scout_id: string | null
  assigned_agent_id: string | null
  assigned_marketing_lead_id: string | null
}

interface ProductivityClientProps {
  staffProductivity: StaffProductivity[]
  staffAthleteMap: Record<string, AssignedAthlete[]>
  allAthletes: AthleteForAssignment[]
}

type TimeRange = 'week' | 'month' | 'all'
type AssignmentRole = 'scout' | 'agent' | 'marketing'

export function ProductivityClient({ staffProductivity, staffAthleteMap, allAthletes }: ProductivityClientProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<StaffProductivity | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showRegionModal, setShowRegionModal] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignRole, setAssignRole] = useState<AssignmentRole>('scout')
  const [assigning, setAssigning] = useState(false)
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [savingRegions, setSavingRegions] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Get all unique regions across staff
  const allRegions = [...new Set(staffProductivity.flatMap(s => s.assigned_regions || []))]

  const getEmails = (staff: StaffProductivity) =>
    timeRange === 'week' ? staff.emailsThisWeek :
    timeRange === 'month' ? staff.emailsThisMonth : staff.emailsAllTime

  const getComms = (staff: StaffProductivity) =>
    timeRange === 'week' ? staff.commsThisWeek :
    timeRange === 'month' ? staff.commsThisMonth : staff.commsAllTime

  const roles = ['all', ...new Set(staffProductivity.map(s => s.role))]

  const filteredStaff = staffProductivity.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || s.role === roleFilter
    const matchesRegion = regionFilter === 'all' || (s.assigned_regions || []).includes(regionFilter)
    return matchesSearch && matchesRole && matchesRegion
  })

  // Calculate totals
  const totalStaff = staffProductivity.length
  const totalAthletes = staffProductivity.reduce((sum, s) => sum + s.athletesManaged, 0)
  const totalContacts = staffProductivity.reduce((sum, s) => sum + (s.contactedThisWeek || 0), 0)
  const totalEmails = staffProductivity.reduce((sum, s) => sum + s.emailsThisWeek, 0)

  // Calculate productivity score (0-100 based on activity)
  const getProductivityScore = (staff: StaffProductivity) => {
    const emailScore = Math.min(staff.emailsThisWeek * 2, 30)
    const commScore = Math.min(staff.commsThisWeek * 3, 40)
    const taskScore = Math.min(staff.tasksCompleted * 5, 30)
    return Math.min(emailScore + commScore + taskScore, 100)
  }

  const avgProductivity = staffProductivity.length > 0
    ? Math.round(staffProductivity.reduce((sum, s) => sum + getProductivityScore(s), 0) / staffProductivity.length)
    : 0

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700'
    if (score >= 60) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  const getRoleBadgeColor = (role: string) => {
    if (role === 'admin') return 'bg-brand-100 text-brand-700'
    if (role === 'coach') return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-600'
  }

  // Get athletes assigned to selected staff
  const assignedAthletes = selectedStaff ? (staffAthleteMap[selectedStaff.id] || []) : []

  // Filter athletes for assignment modal (exclude already assigned for selected role)
  const availableAthletes = allAthletes.filter(a => {
    if (!selectedStaff) return false
    const matchesSearch = a.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                         a.sport.toLowerCase().includes(assignSearch.toLowerCase())

    // Check if already assigned to this staff for this role
    if (assignRole === 'scout' && a.assigned_scout_id === selectedStaff.id) return false
    if (assignRole === 'agent' && a.assigned_agent_id === selectedStaff.id) return false
    if (assignRole === 'marketing' && a.assigned_marketing_lead_id === selectedStaff.id) return false

    return matchesSearch
  })

  const assignAthlete = async (athleteId: string) => {
    if (!selectedStaff) return
    setAssigning(true)

    const updateField = assignRole === 'scout' ? 'assigned_scout_id' :
                       assignRole === 'agent' ? 'assigned_agent_id' :
                       'assigned_marketing_lead_id'

    const { error } = await supabase
      .from('athletes')
      .update({ [updateField]: selectedStaff.id })
      .eq('id', athleteId)

    if (!error) {
      router.refresh()
      setShowAssignModal(false)
      setAssignSearch('')
    }
    setAssigning(false)
  }

  const unassignAthlete = async (athleteId: string, role: string) => {
    const updateField = role === 'Scout' ? 'assigned_scout_id' :
                       role === 'Agent' ? 'assigned_agent_id' :
                       'assigned_marketing_lead_id'

    const { error } = await supabase
      .from('athletes')
      .update({ [updateField]: null })
      .eq('id', athleteId)

    if (!error) {
      router.refresh()
    }
  }

  const openRegionModal = () => {
    if (selectedStaff) {
      setSelectedRegions(selectedStaff.assigned_regions || [])
      setShowRegionModal(true)
    }
  }

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    )
  }

  const saveRegions = async () => {
    if (!selectedStaff) return
    setSavingRegions(true)

    const { error } = await supabase
      .from('users')
      .update({ assigned_regions: selectedRegions })
      .eq('id', selectedStaff.id)

    if (!error) {
      router.refresh()
      setShowRegionModal(false)
    }
    setSavingRegions(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-16 md:h-[92px] flex flex-col justify-center px-4 md:px-6 bg-gray-50 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Staff Productivity</h1>
        <p className="text-sm text-gray-500">Track weekly outreach, communications, and task completion across staff.</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Staff</p>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-3xl font-semibold text-gray-900">{totalStaff}</p>
          </div>

          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Athletes Assigned</p>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-3xl font-semibold text-gray-900">{totalAthletes}</p>
          </div>

          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weekly Contacts</p>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <p className="text-3xl font-semibold text-gray-900">{totalContacts}</p>
          </div>

          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Emails Sent</p>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-3xl font-semibold text-gray-900">{totalEmails}</p>
          </div>

          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Score</p>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-3xl font-semibold text-gray-900">{avgProductivity}</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded border border-gray-200">
          {/* Filters */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              {roles.map(role => (
                <option key={role} value={role}>
                  {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="all">All Regions</option>
              {REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            <div className="flex-1">
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <Link
              href="/settings/team"
              className="px-4 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded"
            >
              Invite Member
            </Link>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Staff Member</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Role</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Athletes</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Contacted</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Emails</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Comms</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map((staff) => {
                  const score = getProductivityScore(staff)
                  return (
                    <tr
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {staff.avatar_url ? (
                            <img src={staff.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-medium text-white">
                              {staff.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">{staff.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(staff.role)}`}>
                          {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">{staff.athletesManaged}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">{staff.contactedThisWeek || 0}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">{getEmails(staff)}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">{getComms(staff)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${getScoreColor(score)}`}>
                          {score}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-out Panel */}
      {selectedStaff && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setSelectedStaff(null)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Staff Details</h2>
              <button
                onClick={() => setSelectedStaff(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {selectedStaff.avatar_url ? (
                  <img src={selectedStaff.avatar_url} alt="" className="w-14 h-14 rounded-full" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center text-lg font-bold text-white">
                    {selectedStaff.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{selectedStaff.name}</h3>
                  <p className="text-sm text-gray-500">{selectedStaff.email}</p>
                  <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(selectedStaff.role)}`}>
                    {selectedStaff.role.charAt(0).toUpperCase() + selectedStaff.role.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Athletes */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned Athletes ({assignedAthletes.length})</h4>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  + Assign
                </button>
              </div>
              {assignedAthletes.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {assignedAthletes.map((athlete) => (
                    <div key={`${athlete.id}-${athlete.role}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <Link href={`/athletes/${athlete.id}`} className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate hover:text-brand-600">{athlete.name}</p>
                        <p className="text-xs text-gray-500">{athlete.sport} · {athlete.role}</p>
                      </Link>
                      <button
                        onClick={() => unassignAthlete(athlete.id, athlete.role)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500"
                        title="Unassign"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No athletes assigned</p>
              )}
            </div>

            {/* Assigned Regions */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned Regions</h4>
                <button
                  onClick={openRegionModal}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Edit
                </button>
              </div>
              {(selectedStaff.assigned_regions || []).length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedStaff.assigned_regions.map(region => (
                    <span key={region} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {region}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No regions assigned</p>
              )}
            </div>

            {/* Activity Stats */}
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Activity</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Contacted This Week</span>
                  <span className="text-sm font-medium text-gray-900">{selectedStaff.contactedThisWeek || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Emails Sent</span>
                  <span className="text-sm font-medium text-gray-900">{getEmails(selectedStaff)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Communications</span>
                  <span className="text-sm font-medium text-gray-900">{getComms(selectedStaff)}</span>
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Tasks</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-sm font-medium text-green-600">{selectedStaff.tasksCompleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="text-sm font-medium text-gray-900">{selectedStaff.tasksPending}</span>
                </div>
                {selectedStaff.tasksOverdue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Overdue</span>
                    <span className="text-sm font-medium text-red-600">{selectedStaff.tasksOverdue}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 space-y-2">
              <Link
                href={`/tasks?assignee=${selectedStaff.id}`}
                className="block w-full text-center py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded"
              >
                View Tasks
              </Link>
              <Link
                href={`/communications?staff=${selectedStaff.id}`}
                className="block w-full text-center py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded"
              >
                View Communications
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Assign Athlete Modal */}
      {showAssignModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign Athlete to {selectedStaff.name}</h3>
              <button
                onClick={() => { setShowAssignModal(false); setAssignSearch('') }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign as</label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as AssignmentRole)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="scout">Scout</option>
                  <option value="agent">Agent</option>
                  <option value="marketing">Marketing Lead</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Search athletes..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Athlete List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
                {availableAthletes.length > 0 ? (
                  availableAthletes.slice(0, 20).map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => assignAthlete(athlete.id)}
                      disabled={assigning}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{athlete.name}</p>
                        <p className="text-xs text-gray-500">{athlete.sport}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  ))
                ) : (
                  <p className="p-4 text-sm text-gray-500 text-center">
                    {assignSearch ? 'No athletes found' : 'Start typing to search athletes'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Regions Modal */}
      {showRegionModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign Regions to {selectedStaff.name}</h3>
              <button
                onClick={() => setShowRegionModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Select the regions this staff member will be responsible for.
              </p>

              <div className="space-y-2 mb-6">
                {REGIONS.map(region => (
                  <label
                    key={region}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRegions.includes(region)
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRegions.includes(region)}
                      onChange={() => toggleRegion(region)}
                      className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900">{region}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRegionModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                  disabled={savingRegions}
                >
                  Cancel
                </button>
                <button
                  onClick={saveRegions}
                  disabled={savingRegions}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded disabled:opacity-50"
                >
                  {savingRegions ? 'Saving...' : 'Save Regions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
