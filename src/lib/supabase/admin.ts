import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Full-privilege client (bypasses auth policies) for admin-only operations
// like creating/removing user accounts. Never import this into client code.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
