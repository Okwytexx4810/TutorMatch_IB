import { getServiceSupabase } from "@/lib/supabase/service";

/**
 * Administrator bootstrapping through a server-side allow-list.
 *
 * Supabase refuses `admin` at signup: `handle_new_user()` only honours the three
 * public roles, so no account can promote itself. The remaining question is how
 * the *first* administrator is made without hand-running SQL.
 *
 * The answer is `ADMIN_EMAILS`, a comma-separated allow-list read from the
 * server environment only. On sign-in and on the auth callback, an account whose
 * email appears in the list is promoted to `admin` through the service role —
 * the one write that legitimately needs elevated privileges. The list is never
 * exposed to the browser, so it cannot be used as an oracle, and an empty list
 * simply disables promotion.
 *
 * This is a bootstrap, not an authorization model: once promoted, the account is
 * an ordinary `admin` and every admin route still re-checks `profiles.role`
 * through `requireRole`.
 */

/** The configured allow-list, lower-cased and de-blanked. */
export function configuredAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );
}

/** Whether `email` is on the administrator allow-list. */
export function isConfiguredAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return configuredAdminEmails().has(email.trim().toLowerCase());
}

/**
 * Promote an account to `admin` when its email is on the allow-list.
 *
 * Server-only. Returns `true` only when a promotion actually happened, so the
 * caller can revalidate. Idempotent: an account already carrying the `admin`
 * role is left untouched (the `neq` filter narrows the update to nothing), and
 * an unconfigured service key is a no-op rather than an error.
 *
 * @param userId The authenticated user id, from Supabase Auth (not the payload).
 * @param email The authenticated user's email.
 */
export async function promoteConfiguredAdmin(
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  if (!isConfiguredAdminEmail(email)) return false;

  const service = getServiceSupabase();
  if (!service) return false;

  const { error } = await service
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId)
    .neq("role", "admin");

  return !error;
}
