import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configError = !url || !key
  ? 'The demo database is not configured: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing.'
  : null

// Reads must never come from the browser's HTTP cache: the homepage reloads
// the list straight after a delete, and a cached response would show the row
// that was just removed.
const noStoreFetch = (input, init = {}) => fetch(input, { ...init, cache: 'no-store' })

// This tool has no authentication at all: no sign-in, no session persistence.
export const supabase = configError
  ? null
  : createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'x-application-name': 'lca-studio' }, fetch: noStoreFetch },
    })

export const IMAGE_BUCKET = 'lca-product-images'

export function publicImageUrl(path) {
  if (!path || !supabase) return null
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}
