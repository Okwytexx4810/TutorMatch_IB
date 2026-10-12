import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Privileged Supabase client using the service-role key.
 *
 * Server-only, by construction: it imports `serverEnv()`, which is invalid in a
 * Client Component and would fail the build rather than leak the key. The
 * service role bypasses Row Level Security, so every call site must have already
 * established authorization in trusted code (a `requireRole` guard or an
 * explicit allow-list check). It is deliberately a plain factory, not a cached
 * singleton, so a request cannot accidentally share elevated state.
 *
 * Returns `null` when the key is not configured, so callers can degrade rather
 * than throw. Never use this to serve a read that RLS should have narrowed.
 */
export function getServiceSupabase(): SupabaseClient | null {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;

  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv();

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
