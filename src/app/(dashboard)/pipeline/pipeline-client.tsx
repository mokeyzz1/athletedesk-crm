'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import type { RecruitingPipeline, PipelineStage } from '@/lib/database.types'

interface PipelineWithAthlete extends RecruitingPipeline {
  athletes: {
    id: string
    name: string
    sport: string
    school: string | null
    marketability_score: number | null
  } | null
}

interface PipelineClientProps {
  initialData: PipelineWithAthlete[]
}

const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string; borderColor: string }[] = [
  { key: 'prospect_identified', label: 'Prospect Identified', color: 'bg-gray-100', borderColor: 'border-gray-300' },
  { key: 'scout_evaluation', label: 'Scout Evaluation', color: 'bg-blue-50', borderColor: 'border-blue-300' },
  { key: 'initial_contact', label: 'Initial Contact', color: 'bg-indigo-50', borderColor: 'border-indigo-300' },
  { key: 'recruiting_conversation', label: 'Recruiting', color: 'bg-purple-50', borderColor: 'border-purple-300' },
  { key: 'interested', label: 'Interested', color: 'bg-yellow-50', borderColor: 'border-yellow-300' },
  { key: 'signing_in_progress', label: 'Signing', color: 'bg-orange-50', borderColor: 'border-orange-300' },
  { key: 'signed_client', label: 'Signed', color: 'bg-green-50', borderColor: 'border-green-300' },
]

function PipelineCard({ item, isDragging }: { item: PipelineWithAthlete; isDragging?: boolean }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-gray-400'
      default: return 'border-l-gray-300'
    }
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${getPriorityColor(item.priority)} ${
        isDragging ? 'shadow-lg ring-2 ring-brand-500 ring-opacity-50' : 'hover:shadow-md'
      } transition-all duration-150`}
    >
      <div className="font-medium text-gray-900">
        {item.athletes?.name ?? 'Unknown Athlete'}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        {item.athletes?.sport}
        {item.athletes?.school && ` · ${item.athletes.school}`}
      </div>
      {item.last_contact_date && (
        <div className="text-xs text-gray-400 mt-2">
          Last contact: {new Date(item.last_contact_date).toLocaleDateString()}
        </div>
      )}
      {item.next_action && (
        <div className="text-xs text-brand-600 mt-1 truncate font-medium">
          Next: {item.next_action}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          item.priority === 'high' ? 'bg-red-100 text-red-700' :
          item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {item.priority}
        </span>
        <Link
          href={`/athletes/${item.athlete_id}`}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          View →
        </Link>
      </div>
    </div>
  )
}

function SortableCard({ item }: { item: PipelineWithAthlete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <PipelineCard item={item} />
    </div>
  )
}

function StageColumn({
  stage,
  items,
}: {
  stage: typeof PIPELINE_STAGES[number]
  items: PipelineWithAthlete[]
}) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className={`${stage.color} border-t-2 ${stage.borderColor} rounded-t-lg px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{stage.label}</h3>
          <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600 shadow-sm">
            {items.length}
          </span>
        </div>
      </div>
      <div className="bg-gray-50 rounded-b-lg p-2 min-h-[400px]">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableCard key={item.id} item={item} />
            ))}
          </div>
        </SortableContext>
        {items.length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm">
            Drop athletes here
          </div>
        )}
      </div>
    </div>
  )
}

export function PipelineClient({ initialData }: PipelineClientProps) {
  const [pipelineData, setPipelineData] = useState<PipelineWithAthlete[]>(initialData)
  const [activeItem, setActiveItem] = useState<PipelineWithAthlete | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const stageGroups = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    items: pipelineData.filter((item) => item.pipeline_stage === stage.key),
  }))

  const handleDragStart = (event: DragStartEvent) => {
    const item = pipelineData.find((p) => p.id === event.active.id)
    if (item) setActiveItem(item)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveItem(null)

    if (!over) return

    const activeItem = pipelineData.find((p) => p.id === active.id)
    if (!activeItem) return

    // Find which stage the item was dropped into
    let newStage: PipelineStage | null = null

    // Check if dropped on another card
    const overItem = pipelineData.find((p) => p.id === over.id)
    if (overItem) {
      newStage = overItem.pipeline_stage
    }

    // If dropped in the same stage, no need to update
    if (!newStage || newStage === activeItem.pipeline_stage) return

    // Optimistic update
    setPipelineData((prev) =>
      prev.map((item) =>
        item.id === active.id ? { ...item, pipeline_stage: newStage! } : item
      )
    )

    // Update in database
    setIsUpdating(true)
    const { error } = await supabase
      .from('recruiting_pipeline')
      .update({ pipeline_stage: newStage } as never)
      .eq('id', active.id)

    if (error) {
      // Revert on error
      setPipelineData((prev) =>
        prev.map((item) =>
          item.id === active.id ? { ...item, pipeline_stage: activeItem.pipeline_stage } : item
        )
      )
      console.error('Failed to update pipeline stage:', error)
    }
    setIsUpdating(false)
  }

  const totalInPipeline = pipelineData.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruiting Pipeline</h1>
          <p className="text-gray-600">
            {totalInPipeline} athlete{totalInPipeline !== 1 ? 's' : ''} in pipeline
            {isUpdating && <span className="ml-2 text-brand-600">Saving...</span>}
          </p>
        </div>
        <Link href="/athletes/new" className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Athlete
        </Link>
      </div>

      {totalInPipeline > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stageGroups.map((stage) => (
              <StageColumn key={stage.key} stage={stage} items={stage.items} />
            ))}
          </div>
          <DragOverlay>
            {activeItem && <PipelineCard item={activeItem} isDragging />}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="card">
          <div className="empty-state">
            <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="empty-state-title">Your pipeline is empty</p>
            <p className="empty-state-description">Start tracking athlete prospects through your recruiting process. Add athletes and assign them to pipeline stages.</p>
            <Link href="/athletes/new" className="btn-primary mt-4 inline-flex">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add First Prospect
            </Link>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500 flex items-center gap-4">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-500"></span>
          High Priority
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-yellow-500"></span>
          Medium Priority
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-gray-400"></span>
          Low Priority
        </span>
      </div>
    </div>
  )
}
