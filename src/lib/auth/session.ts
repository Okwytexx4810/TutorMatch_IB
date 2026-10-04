import { redirect } from "next/navigation";
import type { Route } from "next";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Server-side identity resolution.
 *
 * `getUser()` is used rather than `getClaims()` because it revalidates the token
 * with Supabase Auth on every call. These guards run once per page render, not
 * once per request, so the extra round trip is the right trade for a check that
 * decides who is allowed to see a page.
 *
 * `cache()` deduplicates within a render, so a layout and two nested components
 * calling `requireUser()` still make one network call.
 */

export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
});

/**
 * Require a signed-in user, or send them to `/login`.
 *
 * `nextPath` is preserved as a query parameter so login can return the user to
 * where they were headed. It is only ever used as a redirect target, never as
 * an identity claim.
 *
 * @param nextPath Where the user was trying to reach.
 */
export async function requireUser(nextPath?: Route): Promise<User> {
  const user = await getUser();

  if (!user) {
    const target: Route = nextPath
      ? `/login?next=${encodeURIComponent(nextPath)}`
      : "/login";
    redirect(target);
  }

  return user;
}
