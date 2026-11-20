import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** True when real Supabase credentials are present; otherwise the app runs in local mock mode. */
export const isSupabaseConfigured = Boolean(url && anonKey && url.startsWith('http') && !url.includes('YOUR-'))

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: false }, // prototype: identity is the picked profile, not Supabase Auth
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null

export const PROOF_BUCKET = 'quest-proofs'
