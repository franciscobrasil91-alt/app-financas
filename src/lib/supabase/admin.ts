import { createClient } from '@supabase/supabase-js'

// Cliente com service role — só usar em Server Actions, nunca no cliente
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
