import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)
const cedarAdminUserId = 'bb9a9a8e-83b6-4c7a-b101-dcfdfe9fd20c'
export const isCedarAdminUser = (user) => user?.id === cedarAdminUserId

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: window.sessionStorage,
      },
    })
  : null