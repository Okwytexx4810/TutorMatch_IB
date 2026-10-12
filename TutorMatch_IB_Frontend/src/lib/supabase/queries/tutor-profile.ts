import { getProfile } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/compat";
import type { EducationLevel, TutorProfileRecord, UserProfile } from "@/types/domain";

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
  "id, profile_id, display_name, headline, bio, location, hourly_rate, years_of_experience, is_verified, profile_completeness, created_at, updated_at";

const TUTOR_PROFILE_COLUMNS_BASE =
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

  const read = (columns: string) =>
    supabase
      .from("tutor_profiles")
      .select(columns)
      .eq("profile_id", profile.id)
      .maybeSingle();

  let result = await read(TUTOR_PROFILE_COLUMNS);

  // Pre-migration environments have no `display_name` column. Fall back so an
  // existing tutor profile is still found rather than reported as missing.
  if (result.error && isMissingColumnError(result.error, "display_name")) {
    result = await read(TUTOR_PROFILE_COLUMNS_BASE);
  }

  if (result.error || !result.data) return null;
  // Cast through `unknown`: the union of the two possible column-result shapes
  // does not directly overlap with `TutorProfileRecord`. The column lists above
  // are the asserted contract.
  return result.data as unknown as TutorProfileRecord;
}

/** The signed-in tutor's offerings, split into the two form selects. */
export interface CurrentTutorOfferings {
  subjects: string[];
  levels: EducationLevel[];
}

/**
 * Distinct subjects and levels the signed-in tutor has listed in
 * `tutor_subjects`, for preselecting the profile form's multi-selects. Returns
 * empty lists — not an error — when the tutor has no offerings yet.
 */
export async function getCurrentTutorOfferings(): Promise<CurrentTutorOfferings> {
  const profile = await getProfile();
  if (!profile) return { subjects: [], levels: [] };

  const supabase = await getServerSupabase();

  const tutor = await supabase
    .from("tutor_profiles")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const tutorId = (tutor.data as { id: string } | null | undefined)?.id;
  if (tutor.error || !tutorId) return { subjects: [], levels: [] };

  const result = await supabase
    .from("tutor_subjects")
    .select("subject, level")
    .eq("tutor_id", tutorId);

  if (result.error) return { subjects: [], levels: [] };

  const rows =
    (result.data as { subject: string; level: EducationLevel }[] | null | undefined) ?? [];

  return {
    subjects: Array.from(new Set(rows.map((row) => row.subject))),
    levels: Array.from(new Set(rows.map((row) => row.level))),
  };
}
