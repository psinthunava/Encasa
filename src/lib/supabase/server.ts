import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Async because Next.js 16's cookies() is async; call with `await createClient()`.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component during render; the proxy
            // refreshes the session cookie instead, so this is safe to ignore.
          }
        },
      },
    }
  )
}
