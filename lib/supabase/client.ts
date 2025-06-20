import { createBrowserClient } from '@supabase/ssr'

// Create a singleton client instance for the browser
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )