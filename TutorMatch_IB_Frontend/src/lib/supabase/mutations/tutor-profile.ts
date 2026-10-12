import { getProfile, getUser } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/compat";
import {
  deriveProfileCompleteness,
  type TutorProfileInput,
} from "@/lib/validation/tutor-profile";
import type { EducationLevel, TutorProfileRecord } from "@/types/domain";

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

/**
 * Columns this layer reads back. `display_name` is added by the Stage B
 * migration; until that is applied, `withDisplayNameFallback` retries without
 * it, so the tutor profile form keeps working against the base schema.
 */
const TUTOR_PROFILE_COLUMNS =
  "id, profile_id, display_name, headline, bio, location, hourly_rate, years_of_experience, is_verified, profile_completeness, created_at, updated_at";

const TUTOR_PROFILE_COLUMNS_BASE =
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
  offeringsFailed:
    "Your details were saved, but we could not save your subjects and levels. Please try again.",
} as const;

type SupabaseClient = Awaited<ReturnType<typeof getServerSupabase>>;

/**
 * Reconcile a tutor's offerings in `tutor_subjects` with the form's selection.
 *
 * The rows are the cartesian product of the chosen subjects and levels, which is
 * exactly what discovery reads and what the request-insert policy matches on.
 * Existing rows are left in place; missing ones are inserted and any row the
 * tutor removed is deleted, so unrelated data is never dropped wholesale.
 */
async function syncTutorOfferings(
  supabase: SupabaseClient,
  tutorId: string,
  subjects: string[],
  levels: EducationLevel[],
): Promise<{ ok: true } | { ok: false }> {
  const desired = new Map<string, { tutor_id: string; subject: string; level: EducationLevel }>();
  for (const subject of subjects) {
    for (const level of levels) {
      desired.set(`${subject}\u0000${level}`, { tutor_id: tutorId, subject, level });
    }
  }

  const existingResult = await supabase
    .from("tutor_subjects")
    .select("subject, level")
    .eq("tutor_id", tutorId);

  if (existingResult.error) return { ok: false };

  const existing =
    (existingResult.data as { subject: string; level: EducationLevel }[] | null) ?? [];
  const existingKeys = new Set(
    existing.map((row) => `${row.subject}\u0000${row.level}`),
  );

  const toInsert = Array.from(desired.entries())
    .filter(([key]) => !existingKeys.has(key))
    .map(([, row]) => row);

  if (toInsert.length > 0) {
    const insertResult = await supabase
      .from("tutor_subjects")
      .upsert(toInsert, { onConflict: "tutor_id,subject,level", ignoreDuplicates: true });
    if (insertResult.error) return { ok: false };
  }

  const toDelete = existing.filter(
    (row) => !desired.has(`${row.subject}\u0000${row.level}`),
  );

  for (const row of toDelete) {
    const deleteResult = await supabase
      .from("tutor_subjects")
      .delete()
      .eq("tutor_id", tutorId)
      .eq("subject", row.subject)
      .eq("level", row.level);
    if (deleteResult.error) return { ok: false };
  }

  return { ok: true };
}

/** The columns a tutor is allowed to write, built from validated input. */
interface WritableProfile {
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string;
  hourly_rate: number;
  years_of_experience: number;
  profile_completeness: number;
}

/**
 * Create or update the signed-in tutor's own profile.
 *
 * Branches on an authoritative server-side read rather than trusting the form to
 * say which operation it wants. `upsert` was rejected deliberately: PostgREST
 * folds the whole payload into `DO UPDATE SET` on conflict, which would attempt
 * to write `profile_id` — a column tutors have no `UPDATE` grant on.
 *
 * `input` is typed as `TutorProfileInput`, which carries only the editable
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
  const writable: WritableProfile = {
    display_name: input.displayName,
    headline: input.headline,
    bio: input.bio,
    location: input.location,
    hourly_rate: input.hourlyRate,
    years_of_experience: input.yearsOfExperience,
    profile_completeness: deriveProfileCompleteness(input),
  };

  // Pre-migration fallback payload: everything except `display_name`.
  const basePayload: Omit<WritableProfile, "display_name"> = {
    headline: writable.headline,
    bio: writable.bio,
    location: writable.location,
    hourly_rate: writable.hourly_rate,
    years_of_experience: writable.years_of_experience,
    profile_completeness: writable.profile_completeness,
  };

  const write = async (includeDisplayName: boolean) => {
    const payload = includeDisplayName ? writable : basePayload;
    const columns: string = includeDisplayName
      ? TUTOR_PROFILE_COLUMNS
      : TUTOR_PROFILE_COLUMNS_BASE;

    return existing.data
      ? await supabase
          .from("tutor_profiles")
          .update(payload)
          .eq("profile_id", user.id)
          .select(columns)
          .maybeSingle()
      : await supabase
          .from("tutor_profiles")
          // `profile_id` is set from the session. It is never read from the form.
          .insert({ profile_id: user.id, ...payload })
          .select(columns)
          .maybeSingle();
  };

  let result = await write(true);

  // Pre-migration environments have no `display_name` column. Retry once without
  // it so the rest of the profile can still be saved.
  if (result.error && isMissingColumnError(result.error, "display_name")) {
    result = await write(false);
  }

  if (result.error || !result.data) {
    return { ok: false, message: MESSAGES.failed };
  }

  const saved = result.data as unknown as TutorProfileRecord;

  // A saved profile is only discoverable and bookable once its offerings exist,
  // so the subjects/levels are written to `tutor_subjects` right after the row.
  const offerings = await syncTutorOfferings(
    supabase,
    saved.id,
    input.subjects,
    input.levels,
  );
  if (!offerings.ok) {
    return { ok: false, message: MESSAGES.offeringsFailed };
  }

  // Same justification as the cast in `queries/tutor-profile.ts`: no generated
  // `Database` type exists yet, and the column list is the asserted contract.
  return { ok: true, profile: saved };
}
