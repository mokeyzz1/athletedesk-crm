import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BAD_REGIONS = [
  'Anacortes', 'Bellevue, WA', 'Bend, OR', 'Boise, ID', 'Burien, WA',
  'Curtis Senior', 'Eugene, OR', 'Fruitland, ID', 'Graham, WA',
  'Great Falls, MT', 'Happy Valley, OR', 'Helena, MT', 'Kamiakin',
  'Lake Oswego, OR', 'Lake Stevens, WA', 'Lewiston, ID', 'Portland, OR',
  'Puyallup', 'Puyallup, WA', 'Seattle, WA', 'Sumner, WA', 'Tacoma, WA',
  'West Linn, OR', 'Graham, WA', 'Kennewick, WA', 'Anacortes, WA'
]

export async function DELETE() {
  const supabase = await createClient()

  // Get all athletes
  const { data: athletes, error: fetchError } = await supabase
    .from('athletes')
    .select('id, name, region')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Find ones with bad regions
  const badAthletes = (athletes as { id: string; name: string; region: string | null }[]).filter(a => {
    if (!a.region) return false
    // Check exact match or if it contains comma (city, state format)
    return BAD_REGIONS.includes(a.region) ||
           a.region.includes(',') ||
           /\b(WA|OR|ID|MT)\b/.test(a.region)
  })

  if (badAthletes.length === 0) {
    return NextResponse.json({ message: 'No bad imports found', deleted: 0, total: athletes.length })
  }

  // Delete them
  const ids = badAthletes.map(a => a.id)
  const { error: deleteError } = await supabase
    .from('athletes')
    .delete()
    .in('id', ids)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Cleanup complete',
    deleted: ids.length,
    remaining: athletes.length - ids.length,
    samples: badAthletes.slice(0, 5).map(a => ({ name: a.name, region: a.region }))
  })
}
