import type { Route } from "next";

import type { UserRole } from "@/types/domain";

/**
 * Role vocabulary and the role *intent* captured at signup.
 *
 * Authorisation reads `role` from the `profiles` table, which the
 * `handle_new_user()` trigger writes and the account holder cannot edit. Guards
 * call `requireRole()` in `@/lib/auth/session`.
 *
 * `user_metadata.role` is a request made at registration, nothing more. It is
 * deliberately not used for routing or for access decisions; `intendedRole()`
 * below is retained only for non-authoritative presentation.
 */

/** Roles a public visitor may choose on the registration form. */
export const PUBLIC_ROLES = ["student", "parent", "tutor"] as const;

export type PublicRole = (typeof PUBLIC_ROLES)[number];

/** `admin` is intentionally not a publicly registrable role. */
export function isPublicRole(value: unknown): value is PublicRole {
  return (
    typeof value === "string" &&
    (PUBLIC_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Where a user belongs after signing in, for a given role.
 *
 * A pure routing decision. Pass the trusted `profiles.role`, never a metadata
 * claim. The destination still runs its own server-side guard, so a wrong call
 * here cannot expose anything.
 */
export function homeForRole(
  role: UserRole | PublicRole | null | undefined,
): Route {
  if (role === "tutor") return "/tutor/dashboard";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

/**
 * The role the user said they wanted at registration.
 *
 * Reads Supabase `user_metadata`, which is writable by the account holder.
 * Untrusted presentation data. Do not use this to route or to gate anything;
 * use `requireRole()`, which reads the database profile instead.
 */
export function intendedRole(
  user: { user_metadata?: Record<string, unknown> } | null | undefined,
): PublicRole | null {
  const claimed = user?.user_metadata?.role;
  return isPublicRole(claimed) ? claimed : null;
}
