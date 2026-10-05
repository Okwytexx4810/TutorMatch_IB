import { getProfile, getUser } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  deriveProfileCompleteness,
  type TutorProfileInput,
} from "@/lib/validation/tutor-profile";
import type { TutorProfileRecord } from "@/types/domain";

/**
 * Write helpers for the tutor profile domain.
 *
 * Server-only by convention, per `lib/supabase/README.md`.
 *
 * Three rules hold for every function in this file:
 *
 * 1. **Ownership is derived, never received.** No function takes a `tutor_id`,
 *    `profile_id` or `user_id`. The owner is read from the request session, so a
 *    caller cannot express "save this for somebody else" even by accident.
 * 2. **The request-scoped client is used, never the service role.** Every write
 *    therefore passes through the Phase 4 RLS policies as the signed-in user.
 *    That is the point: `tutor_profiles_insert_own` and
 *    `tutor_profiles_update_own` independently re-check ownership, so this layer
 *    is a convenience on top of the database, not the security boundary.
 * 3. **Only granted columns are written.** `is_verified` is a moderation field
 *    with no `INSERT` or `UPDATE` grant, so it is never part of a payload. The
 *    database would reject the write anyway; omitting it keeps the failure mode
 *    a clean error rather than a confusing permission denial.
 */

/** Columns this layer is permitted to write. */
const TUTOR_PROFILE_COLUMNS =
  "id, profile_id, headline, bio, location, hourly_rate, years_of_experience, is_verified, profile_completeness, created_at, updated_at";

export type SaveTutorProfileResult =
  | { ok: true; profile: TutorProfileRecord }
  | { ok: false; message: string };

/**
 * Messages the UI may show. Deliberately generic: a Supabase or Postgres error
 * string can carry table names, constraint names and SQL fragments, none of
 * which belong in a browser.
 */
const MESSAGES = {
  signedOut: "Your session has expired. Please sign in again.",
  notTutor: "Only tutor accounts can save a tutor profile.",
  failed: "We could not save your profile just now. Please try again.",
} as const;

/**
 * Create or update the signed-in tutor's own profile.
 *
 * Branches on an authoritative server-side read rather than trusting the form to
 * say which operation it wants. `upsert` was rejected deliberately: PostgREST
 * folds the whole payload into `DO UPDATE SET` on conflict, which would attempt
 * to write `profile_id` — a column tutors have no `UPDATE` grant on.
 *
 * `input` is typed as `TutorProfileInput`, which carries only the five editable
 * fields, so `is_verified` and the id columns cannot be expressed here at all.
 * `profile_completeness` is supplied below rather than taken from `input`, so
 * the only thing this function writes is what the form is allowed to write.
 * See `src/app/tutor/actions.ts` for where that input comes from.
 */
export async function saveCurrentTutorProfile(
  input: TutorProfileInput,
): Promise<SaveTutorProfileResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  // Trusted role, read from `profiles`. The submitted payload has no role field
  // and could not introduce one, because the schema is a strict object.
  const profile = await getProfile();
  if (!profile || profile.role !== "tutor") {
    return { ok: false, message: MESSAGES.notTutor };
  }

  const supabase = await getServerSupabase();

  const existing = await supabase
    .from("tutor_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing.error) return { ok: false, message: MESSAGES.failed };

  // Computed here, not accepted from the client. The column is tutor-writable in
  // the Phase 4 grants, so trusting the form would let any account claim 100%.
  const writable = {
    headline: input.headline,
    bio: input.bio,
    location: input.location,
    hourly_rate: input.hourlyRate,
    years_of_experience: input.yearsOfExperience,
    profile_completeness: deriveProfileCompleteness(input),
  };

  const result = existing.data
    ? await supabase
        .from("tutor_profiles")
        .update(writable)
        .eq("profile_id", user.id)
        .select(TUTOR_PROFILE_COLUMNS)
        .maybeSingle()
    : await supabase
        .from("tutor_profiles")
        // `profile_id` is set from the session. It is never read from the form.
        .insert({ profile_id: user.id, ...writable })
        .select(TUTOR_PROFILE_COLUMNS)
        .maybeSingle();

  if (result.error || !result.data) {
    return { ok: false, message: MESSAGES.failed };
  }

  // Same justification as the cast in `queries/tutor-profile.ts`: no generated
  // `Database` type exists yet, and the column list is the asserted contract.
  return { ok: true, profile: result.data as TutorProfileRecord };
}
