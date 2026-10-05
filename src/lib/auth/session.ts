import { redirect } from "next/navigation";
import type { Route } from "next";
import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/auth/roles";
import type { UserProfile, UserRole } from "@/types/domain";

/**
 * Server-side identity and role resolution.
 *
 * `getUser()` is used rather than `getClaims()` because it revalidates the token
 * with Supabase Auth on every call. These guards run once per page render, not
 * once per request, so the extra round trip is the right trade for a check that
 * decides who is allowed to see a page.
 *
 * `cache()` deduplicates within a render, so a layout and two nested components
 * calling `requireUser()` still make one network call.
 *
 * Roles are read from the database `profiles` table, never from
 * `user_metadata`. `user_metadata` is writable by the account holder, so it can
 * express intent but cannot grant access.
 */

const PROFILE_COLUMNS =
  "id, email, full_name, role, phone, location, avatar_url, created_at, updated_at";

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
 * The signed-in user's database profile, or null when unauthenticated.
 *
 * This is the trusted role source. Reads are subject to the `profiles_select_own`
 * RLS policy, so a user can only ever load their own row.
 */
export const getProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
});

/**
 * The signed-in user's trusted application role, or null when there is none.
 *
 * A null result means either "not signed in" or "signed in but no `profiles`
 * row yet", which is why callers must not treat null as a permission.
 */
export const getRole = cache(async (): Promise<UserRole | null> => {
  const profile = await getProfile();
  return profile?.role ?? null;
});

/**
 * Read the trusted role for a known user id through an explicit client.
 *
 * Used where a session was just established inside the current request, such as
 * sign-in, sign-up and the auth callback. In those flows the new session lives
 * only in the client's memory, because the cookies are written to the outgoing
 * response and cannot be read back, so `getRole()` would still see the old,
 * unauthenticated request. Passing the live client reads the profile as the
 * freshly authenticated user, which is exactly the identity being routed.
 *
 * @param client A client already holding the session being routed.
 * @param userId The authenticated user id, as returned by Supabase Auth.
 */
export async function readTrustedRole(
  client: SupabaseClient,
  userId: string,
): Promise<UserRole | null> {
  const { data, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { role: UserRole }).role;
}

/** A signed-in user together with their trusted database role. */
export interface AuthenticatedActor {
  user: User;
  profile: UserProfile;
  role: UserRole;
}

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

/**
 * Require one of the given trusted roles, or redirect the user to the area
 * their own role actually owns.
 *
 * Authorisation is server-side and database-backed: the role comes from
 * `profiles.role`, which the account holder cannot edit. A student hitting
 * `/tutor/*` is sent to `/dashboard`, a tutor hitting `/admin/*` is sent to
 * `/tutor/dashboard`, so a denied request never loops.
 *
 * Fails closed. If Supabase is unconfigured, the session cannot be verified, or
 * the account has no profile row, the user is treated as having no role and is
 * redirected to the student area rather than being shown protected content.
 *
 * @param allowed Roles permitted to view the guarded route.
 * @param nextPath Where the user was trying to reach, for the login bounce.
 */
export async function requireRole(
  allowed: readonly UserRole[],
  nextPath?: Route,
): Promise<AuthenticatedActor> {
  const user = await requireUser(nextPath);
  const profile = await getProfile();

  if (!profile || !allowed.includes(profile.role)) {
    // homeForRole() defaults to the student dashboard for an unknown role, so a
    // profile-less or unrecognised account lands somewhere it is allowed to be.
    redirect(homeForRole(profile?.role ?? null));
  }

  return { user, profile, role: profile.role };
}