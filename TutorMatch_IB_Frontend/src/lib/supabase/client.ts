import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

/**
 * Browser Supabase client.
 *
 * The only module allowed to talk to Supabase from the client. It is created
 * lazily and memoised so a page that never authenticates never pays for it, and
 * so every component on a page shares one client (and therefore one set of auth
 * listeners and one token refresh).
 *
 * Only the publishable key is read. The service role key is never reachable
 * from here, and never appears in a client bundle.
 */

let browserClient: SupabaseClient | undefined;

export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    publicEnv();

  browserClient = createBrowserClient<never>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return browserClient;
}
