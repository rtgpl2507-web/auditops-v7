import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The backend always uses the SERVICE ROLE key (never the anon key) because
// it needs full read/write access and Row Level Security has no policies
// defined for the anon role (see supabase/schema.sql).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

/** True when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are both set. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

/** Lazily creates and returns the singleton Supabase client. Throws if env vars are missing. */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false },
    });
  }
  return client;
}
