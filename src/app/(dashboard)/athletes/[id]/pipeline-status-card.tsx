'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RecruitingPipeline } from '@/lib/database.types'

interface PipelineStatusCardProps {
  pipeline: RecruitingPipeline | null
}

export function PipelineStatusCard({ pipeline: initialPipeline }: PipelineStatusCardProps) {
  const [pipeline, setPipeline] = useState(initialPipeline)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [showStageMenu, setShowStageMenu] = useState(false)

  const priorities: { value: 'high' | 'medium' | 'low'; label: string; badgeClass: string }[] = [
    { value: 'high', label: 'High', badgeClass: 'badge-red' },
    { value: 'medium', label: 'Medium', badgeClass: 'badge-yellow' },
    { value: 'low', label: 'Low', badgeClass: 'badge-gray' },
  ]

  const stages = [
    { key: 'prospect_identified', label: 'Prospect Identified' },
    { key: 'scout_evaluation', label: 'Scout Evaluation' },
    { key: 'initial_contact', label: 'Initial Contact' },
    { key: 'recruiting_conversation', label: 'Recruiting' },
    { key: 'interested', label: 'Interested' },
    { key: 'signing_in_progress', label: 'Signing' },
    { key: 'signed_client', label: 'Signed' },
  ]

  const handlePriorityChange = async (newPriority: 'high' | 'medium' | 'low') => {
    if (!pipeline || newPriority === pipeline.priority) {
      setShowPriorityMenu(false)
      return
    }

    const oldPriority = pipeline.priority
    setPipeline({ ...pipeline, priority: newPriority })
    setShowPriorityMenu(false)

    const supabase = createClient()
    const { error } = await supabase
      .from('recruiting_pipeline')
      .update({ priority: newPriority } as never)
      .eq('id', pipeline.id)

    if (error) {
      setPipeline({ ...pipeline, priority: oldPriority })
      console.error('Failed to update priority:', error)
    }
  }

  const handleStageChange = async (newStage: string) => {
    if (!pipeline || newStage === pipeline.pipeline_stage) {
      setShowStageMenu(false)
      return
    }

    const oldStage = pipeline.pipeline_stage
    setPipeline({ ...pipeline, pipeline_stage: newStage as typeof pipeline.pipeline_stage })
    setShowStageMenu(false)

    const supabase = createClient()
    const { error } = await supabase
      .from('recruiting_pipeline')
      .update({ pipeline_stage: newStage } as never)
      .eq('id', pipeline.id)

    if (error) {
      setPipeline({ ...pipeline, pipeline_stage: oldStage })
      console.error('Failed to update stage:', error)
    }
  }

  const currentPriority = priorities.find(p => p.value === pipeline?.priority) || priorities[1]

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Status</h2>
      {pipeline ? (
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-500">Stage</span>
            <div className="relative mt-1">
              <button
                onClick={() => setShowStageMenu(!showStageMenu)}
                className="text-sm font-medium text-gray-900 capitalize cursor-pointer hover:text-brand-600 flex items-center gap-1"
              >
                {pipeline.pipeline_stage.replace(/_/g, ' ')}
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showStageMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStageMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 min-w-[180px]">
                    {stages.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => handleStageChange(s.key)}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                          s.key === pipeline.pipeline_stage ? 'bg-gray-50 font-medium' : ''
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Priority</span>
            <div className="relative mt-1">
              <button
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                className={`${currentPriority.badgeClass} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300`}
              >
                {pipeline.priority}
              </button>
              {showPriorityMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowPriorityMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 py-1 min-w-[100px]">
                    {priorities.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => handlePriorityChange(p.value)}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                          p.value === pipeline.priority ? 'bg-gray-50' : ''
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          p.value === 'high' ? 'bg-red-500' :
                          p.value === 'medium' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {pipeline.last_contact_date && (
            <div>
              <span className="text-sm text-gray-500">Last Contact</span>
              <p className="text-sm text-gray-900">
                {new Date(pipeline.last_contact_date).toLocaleDateString()}
              </p>
            </div>
          )}
          {pipeline.next_action && (
            <div>
              <span className="text-sm text-gray-500">Next Action</span>
              <p className="text-sm text-gray-900">{pipeline.next_action}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Not in pipeline</p>
      )}
    </div>
  )
}
