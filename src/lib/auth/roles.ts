import type { Route } from "next";

import type { UserRole } from "@/types/domain";

/**
 * Role vocabulary and the role *intent* captured at signup.
 *
 * IMPORTANT: `intendedRole` reads `user_metadata`, which the user controls.
 * It is therefore a UX hint only. It must never be used to authorise anything.
 * Authorisation arrives in Phase 4, reading `role` from the `profiles` table
 * under Row Level Security, and every guard re-checks on the server.
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
 * Where a user belongs after signing in, based on the role they registered with.
 * A pure routing decision; the destination still runs its own server guard.
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
 * Treat the result as untrusted presentation data, never as a permission.
 */
export function intendedRole(
  user: { user_metadata?: Record<string, unknown> } | null | undefined,
): PublicRole | null {
  const claimed = user?.user_metadata?.role;
  return isPublicRole(claimed) ? claimed : null;
}
