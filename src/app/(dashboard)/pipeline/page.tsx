import { createClient } from '@/lib/supabase/server'
import type { RecruitingPipeline } from '@/lib/database.types'
import { PipelineClient } from './pipeline-client'

interface PipelineWithAthlete extends RecruitingPipeline {
  athletes: {
    id: string
    name: string
    sport: string
    school: string | null
    marketability_score: number | null
    recruiting_status: string
  } | null
}

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('recruiting_pipeline')
    .select(`
      *,
      athletes (
        id,
        name,
        sport,
        school,
        marketability_score,
        recruiting_status
      )
    `)
    .order('priority', { ascending: true })

  const pipelineData = (data as PipelineWithAthlete[]) || []

  return <PipelineClient initialData={pipelineData} />
}
