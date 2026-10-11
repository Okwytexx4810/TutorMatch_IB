import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import { publicEnv } from "@/lib/env";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers.
 *
 * Two rules make this correct:
 *
 * 1. A fresh client per request. `cache()` deduplicates calls within a single
 *    render but never shares a client across requests, which would leak one
 *    visitor's session into another's response.
 * 2. Token refresh is written back to cookies. `setAll` is implemented because
 *    omitting it is the classic cause of "random logouts" with this library.
 *
 * In a Server Component `cookies().set()` throws, because the response is
 * already streaming. That is expected and safe: `src/proxy.ts` runs before
 * every render and performs the refresh there, so the cookie written by the
 * proxy is what the page reads.
 */
export const getServerSupabase = cache(async (): Promise<SupabaseClient> => {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    publicEnv();

  return createServerClient<never>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, headers) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }

            // The no-store cache headers Supabase asks for cannot be set from a
            // Server Component. `src/proxy.ts` applies them to the response for
            // every matched route, which covers this path.
            void headers;
          } catch {
            // Read-only cookie store: a Server Component. Refreshed by proxy.
          }
        },
      },
    },
  );
});
