import { createClient } from '@supabase/supabase-js'

// Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (Vercel env or .env).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // parses the OAuth redirect hash automatically
  },
})
