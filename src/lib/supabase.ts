import { createClient } from '@supabase/supabase-js'
import type { AppConfig } from './config'
import type { Database } from './database.types'

export function createSupabase(config: AppConfig) {
  return createClient<Database>(config.url, config.key, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  })
}
export type AppClient = ReturnType<typeof createSupabase>
