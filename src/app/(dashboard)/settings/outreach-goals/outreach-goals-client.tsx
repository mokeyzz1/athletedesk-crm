'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { OutreachGoal } from './page'

interface OutreachGoalsClientProps {
  goals: OutreachGoal[]
  staff: { id: string; name: string; role: string }[]
}

type Metric = 'emails' | 'calls' | 'texts' | 'all_communications'
type Period = 'weekly' | 'monthly'
type Role = 'admin' | 'agent' | 'scout' | 'marketing' | 'intern'

export function OutreachGoalsClient({ goals: initialGoals, staff }: OutreachGoalsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [goals, setGoals] = useState(initialGoals)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<OutreachGoal | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metric: 'emails' as Metric,
    target_count: 10,
    period: 'weekly' as Period,
    staff_id: '',
    target_role: '',
    is_active: true,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      metric: 'emails',
      target_count: 10,
      period: 'weekly',
      staff_id: '',
      target_role: '',
      is_active: true,
    })
    setEditingGoal(null)
    setError(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (goal: OutreachGoal) => {
    setEditingGoal(goal)
    setFormData({
      name: goal.name,
      description: goal.description || '',
      metric: goal.metric,
      target_count: goal.target_count,
      period: goal.period,
      staff_id: goal.staff_id || '',
      target_role: goal.target_role || '',
      is_active: goal.is_active,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.target_count) {
      setError('Name and target count are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const goalData = {
        name: formData.name,
        description: formData.description || null,
        metric: formData.metric,
        target_count: formData.target_count,
        period: formData.period,
        staff_id: formData.staff_id || null,
        target_role: formData.target_role || null,
        is_active: formData.is_active,
      }

      if (editingGoal) {
        // Update existing goal
        const { error: updateError } = await supabase
          .from('outreach_goals')
          .update(goalData as never)
          .eq('id', editingGoal.id)

        if (updateError) throw updateError

        setGoals(prev =>
          prev.map(g => (g.id === editingGoal.id ? { ...g, ...goalData } : g))
        )
      } else {
        // Get current user ID for created_by
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('google_sso_id', user?.id || '')
          .single()

        if (!userData) throw new Error('User not found')

        const insertData = {
          ...goalData,
          created_by: (userData as { id: string }).id,
        }

        const { data: newGoal, error: insertError } = await supabase
          .from('outreach_goals')
          .insert(insertData as never)
          .select('*, staff:staff_id(id, name)')
          .single()

        if (insertError) throw insertError

        setGoals(prev => [newGoal as OutreachGoal, ...prev])
      }

      setShowModal(false)
      resetForm()
      router.refresh()
    } catch (err) {
      console.error('Error saving goal:', err)
      setError('Failed to save goal. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (goal: OutreachGoal) => {
    try {
      const { error: updateError } = await supabase
        .from('outreach_goals')
        .update({ is_active: !goal.is_active } as never)
        .eq('id', goal.id)

      if (updateError) throw updateError

      setGoals(prev =>
        prev.map(g => (g.id === goal.id ? { ...g, is_active: !g.is_active } : g))
      )
    } catch (err) {
      console.error('Error toggling goal:', err)
    }
  }

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const { error: deleteError } = await supabase
        .from('outreach_goals')
        .delete()
        .eq('id', goalId)

      if (deleteError) throw deleteError

      setGoals(prev => prev.filter(g => g.id !== goalId))
    } catch (err) {
      console.error('Error deleting goal:', err)
    }
  }

  const getMetricLabel = (metric: Metric) => {
    const labels: Record<Metric, string> = {
      emails: 'Emails',
      calls: 'Calls',
      texts: 'Texts',
      all_communications: 'All Communications',
    }
    return labels[metric]
  }

  const getPeriodLabel = (period: Period) => {
    return period === 'weekly' ? 'per week' : 'per month'
  }

  const getTargetLabel = (goal: OutreachGoal) => {
    if (goal.staff_id && goal.staff) {
      return goal.staff.name
    }
    if (goal.target_role) {
      return `All ${goal.target_role}s`
    }
    return 'All staff'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 h-[92px] flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outreach Goals</h1>
            <p className="text-gray-500 text-sm">Set communication targets for your team</p>
          </div>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Goal
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {goals.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No goals set</h3>
            <p className="text-gray-500 mb-4">Create your first outreach goal to start tracking team performance</p>
            <button onClick={openCreateModal} className="btn-primary">
              Create Goal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map(goal => (
              <div
                key={goal.id}
                className={`card ${!goal.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
                      <span className={`badge ${goal.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {goal.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-gray-600">
                          <strong>{goal.target_count}</strong> {getMetricLabel(goal.metric)} {getPeriodLabel(goal.period)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-600">{getTargetLabel(goal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(goal)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title={goal.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {goal.is_active ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(goal)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingGoal ? 'Edit Goal' : 'Create Goal'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-700 px-4 py-2 rounded text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Weekly Email Target"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="Optional description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Metric *
                    </label>
                    <select
                      value={formData.metric}
                      onChange={(e) => setFormData({ ...formData, metric: e.target.value as Metric })}
                      className="input-field"
                    >
                      <option value="emails">Emails</option>
                      <option value="calls">Calls</option>
                      <option value="texts">Texts</option>
                      <option value="all_communications">All Communications</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Period *
                    </label>
                    <select
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value as Period })}
                      className="input-field"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Count *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.target_count}
                    onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Apply To</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Specific Staff Member
                      </label>
                      <select
                        value={formData.staff_id}
                        onChange={(e) => setFormData({ ...formData, staff_id: e.target.value, target_role: '' })}
                        className="input-field"
                      >
                        <option value="">None (use role or all)</option>
                        {staff.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    {!formData.staff_id && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Or By Role
                        </label>
                        <select
                          value={formData.target_role}
                          onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                          className="input-field"
                        >
                          <option value="">All Staff</option>
                          <option value="scout">Scouts</option>
                          <option value="agent">Agents</option>
                          <option value="marketing">Marketing</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-brand-600 rounded border-gray-300"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Goal is active
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingGoal ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
