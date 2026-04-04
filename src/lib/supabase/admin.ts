import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Admin client that bypasses RLS for server-side operations
// Only use this for trusted server-side operations
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Fall back to anon key if service role isn't available
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient<Database>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
