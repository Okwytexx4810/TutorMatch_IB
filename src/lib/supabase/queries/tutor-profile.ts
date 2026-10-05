import { getProfile } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import type { TutorProfileRecord, UserProfile } from "@/types/domain";

/**
 * Read helpers for the tutor profile domain.
 *
 * Server-only by convention, per `lib/supabase/README.md`. The `server-only`
 * package is not a dependency of this project, so the rule is enforced by
 * placement plus the fact that `getServerSupabase` depends on `next/headers`,
 * which throws if a Client Component ever reaches it.
 *
 * Ownership is never a parameter. Every function here resolves the caller from
 * the request session, so there is no signature a caller could use to ask for
 * somebody else's row. `tutor_profiles` is additionally protected by RLS:
 * `tutor_profiles_public_read` is the only open policy, and reads presentation
 * data rather than anything addressed by identity.
 */

/**
 * Columns the application is allowed to see.
 *
 * `is_verified` is read-only for tutors by design and is included so the UI can
 * show verification state. It is not writable by any client.
 */
const TUTOR_PROFILE_COLUMNS =
  "id, profile_id, headline, bio, location, hourly_rate, years_of_experience, is_verified, profile_completeness, created_at, updated_at";

/**
 * The signed-in user's `profiles` row.
 *
 * Delegates to `getProfile()` from `lib/auth/session.ts`, which is already the
 * project's trusted identity lookup. This is an alias for discoverability from
 * the data layer, not a second implementation.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  return getProfile();
}

/**
 * The signed-in user's own tutor profile, or `null` when they have not created
 * one yet.
 *
 * Returning `null` is a normal onboarding state, not an error, so the caller
 * renders an empty state rather than a failure.
 *
 * The `as` cast is unavoidable and matches `lib/auth/session.ts`: the Supabase
 * client is untyped until a `Database` type is generated from the project
 * schema, which has not been done. It is confined to this single line, and the
 * column list above is the contract it is asserting against.
 */
export async function getCurrentTutorProfile(): Promise<TutorProfileRecord | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("tutor_profiles")
    .select(TUTOR_PROFILE_COLUMNS)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as TutorProfileRecord;
}
