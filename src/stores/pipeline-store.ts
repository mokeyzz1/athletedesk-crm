import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { PipelineStage } from '@/lib/database.types'
import { logClientActivityEvent } from '@/lib/activity-client'

interface PipelineData {
  id: string
  athlete_id: string
  priority: 'high' | 'medium' | 'low'
  pipeline_stage: PipelineStage
}

interface PipelineStore {
  pipelines: Map<string, PipelineData>

  // Set initial data
  setPipelines: (data: PipelineData[]) => void

  // Update priority (updates store and database)
  updatePriority: (athleteId: string, newPriority: 'high' | 'medium' | 'low') => Promise<{ success: boolean; error?: string }>

  // Update stage (updates store and database)
  updateStage: (athleteId: string, newStage: PipelineStage) => Promise<{ success: boolean; error?: string }>

  // Get pipeline by athlete ID
  getPipeline: (athleteId: string) => PipelineData | undefined
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  pipelines: new Map(),

  setPipelines: (data) => {
    const map = new Map<string, PipelineData>()
    data.forEach(p => map.set(p.athlete_id, p))
    set({ pipelines: map })
  },

  updatePriority: async (athleteId, newPriority) => {
    const pipeline = get().pipelines.get(athleteId)
    if (!pipeline) return { success: false, error: 'Pipeline not found' }

    const oldPriority = pipeline.priority

    // Optimistic update
    set(state => {
      const newPipelines = new Map(state.pipelines)
      newPipelines.set(athleteId, { ...pipeline, priority: newPriority })
      return { pipelines: newPipelines }
    })

    // Update database
    const supabase = createClient()
    const { error } = await supabase
      .from('recruiting_pipeline')
      .update({ priority: newPriority } as never)
      .eq('athlete_id', athleteId)

    if (error) {
      // Revert on error
      set(state => {
        const newPipelines = new Map(state.pipelines)
        newPipelines.set(athleteId, { ...pipeline, priority: oldPriority })
        return { pipelines: newPipelines }
      })
      console.error('Failed to update priority:', error)
      return { success: false, error: 'Could not update priority. Please try again.' }
    }

    await logClientActivityEvent({
      entityType: 'athlete',
      entityId: athleteId,
      eventType: 'pipeline.priority_changed',
      title: `Pipeline priority changed to ${newPriority}`,
      metadata: {
        pipeline_id: pipeline.id,
        previous_priority: oldPriority,
        new_priority: newPriority,
        source: 'pipeline_store',
      },
    })
    return { success: true }
  },

  updateStage: async (athleteId, newStage) => {
    const pipeline = get().pipelines.get(athleteId)
    if (!pipeline) return { success: false, error: 'Pipeline not found' }

    const oldStage = pipeline.pipeline_stage

    // Optimistic update
    set(state => {
      const newPipelines = new Map(state.pipelines)
      newPipelines.set(athleteId, { ...pipeline, pipeline_stage: newStage })
      return { pipelines: newPipelines }
    })

    // Update database
    const supabase = createClient()
    const { error } = await supabase
      .from('recruiting_pipeline')
      .update({ pipeline_stage: newStage } as never)
      .eq('athlete_id', athleteId)

    if (error) {
      // Revert on error
      set(state => {
        const newPipelines = new Map(state.pipelines)
        newPipelines.set(athleteId, { ...pipeline, pipeline_stage: oldStage })
        return { pipelines: newPipelines }
      })
      console.error('Failed to update stage:', error)
      return { success: false, error: 'Could not update stage. Please try again.' }
    }

    await logClientActivityEvent({
      entityType: 'athlete',
      entityId: athleteId,
      eventType: 'pipeline.stage_changed',
      title: `Pipeline stage changed to ${newStage.replace(/_/g, ' ')}`,
      metadata: {
        pipeline_id: pipeline.id,
        previous_stage: oldStage,
        new_stage: newStage,
        source: 'pipeline_store',
      },
    })

    // Auto-sync: signed pipeline changes should use the status API so handoffs,
    // assignment notifications, and signed status stay consistent across screens.
    if (newStage === 'signed_client') {
      const response = await fetch(`/api/athletes/${athleteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'signed' }),
      })

      if (!response.ok) {
        set(state => {
          const newPipelines = new Map(state.pipelines)
          newPipelines.set(athleteId, { ...pipeline, pipeline_stage: oldStage })
          return { pipelines: newPipelines }
        })

        const result = await response.json().catch(() => null)
        console.error('Failed to update signed status:', result?.error || response.statusText)
        return { success: false, error: 'Could not update signed status. Please try again.' }
      }
    }

    return { success: true }
  },

  getPipeline: (athleteId) => {
    return get().pipelines.get(athleteId)
  },
}))
