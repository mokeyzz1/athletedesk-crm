import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lonbjhjjmsvmngldcyuy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbmJqaGpqbXN2bW5nbGRjeXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTkwMDYsImV4cCI6MjA4OTI3NTAwNn0.--Tbxu8TNMvYELCQhR5Sp8BgXLfDZpiIIBh5aCQ4OE4'
)

async function run() {
  // Check multiple tables
  const tables = ['athletes', 'recruiting_pipeline']

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    console.log(`${table}: ${error ? error.message : count + ' rows'}`)
  }

  // Try to get athletes without RLS by checking if there's any error
  const { data, error } = await supabase.from('athletes').select('id, name, region')
  console.log('Athletes query result:', error?.message || `${data?.length} rows`)
  if (data && data.length > 0) {
    console.log('Sample:', data.slice(0, 3))
  }
}

run()
