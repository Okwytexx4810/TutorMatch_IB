import { z } from "zod";

/**
 * Zod schema for the tutor profile form.
 *
 * Responsibilities:
 *
 * 1. **Shape and range.** Field types, trimming, and the bounds below.
 * 2. **One schema, two callers.** The same schema validates the server action's
 *    `FormData` and the shape the data layer writes, so the form and the write
 *    can never disagree about what is valid.
 *
 * On protected fields, because it is easy to assume otherwise here:
 * this schema does **not** enforce them. `z.strictObject` rejects a key the
 * form does not own, but the server action assembles its parse input from an
 * explicit allowlist of five named `FormData` fields, so a submitted
 * `is_verified`, `profile_id`, `id`, `created_at` or `updated_at` is never read
 * into the object this schema ever sees. The `strict` mode is a second net for a
 * future caller that does pass raw input; it is not the control that stops a
 * crafted submission. That control is the allowlist, plus the server-side
 * writable object, plus the database grants and RLS. See
 * `src/app/tutor/actions.ts` for the full sequence.
 *
 * The numeric fields arrive as strings because that is what a form control
 * submits. `z.coerce` performs the conversion, so callers pass raw input and
 * never `parseInt` by hand.
 */

/** Mirrors `tutor_profiles_headline_length` in the Phase 4 migration. */
const HEADLINE_MAX = 140;
/** No database limit; a deliberate product bound so a profile stays readable. */
const BIO_MAX = 2000;
const LOCATION_MAX = 120;
/** Whole naira. The migration stores an integer precisely to avoid float money. */
const HOURLY_RATE_MAX = 1_000_000;
/** `smallint` in the database, bounded to something a person can claim. */
const YEARS_MAX = 80;

export const tutorProfileLimits = {
  headline: HEADLINE_MAX,
  bio: BIO_MAX,
  location: LOCATION_MAX,
} as const;

/**
 * Optional text that becomes SQL `NULL` when left blank.
 *
 * Trimming first means a field of only spaces is treated as absent rather than
 * stored as an empty string that would read as "provided but blank".
 */
function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value.length > 0 ? value : null));
}

export const tutorProfileSchema = z.strictObject({
  headline: optionalText(
    HEADLINE_MAX,
    `Keep your headline under ${HEADLINE_MAX} characters.`,
  ),

  bio: optionalText(BIO_MAX, `Keep your bio under ${BIO_MAX} characters.`),

  location: z
    .string()
    .trim()
    .min(2, "Enter the area or town you teach in.")
    .max(LOCATION_MAX, `Keep your location under ${LOCATION_MAX} characters.`),

  hourlyRate: z.coerce
    .number({ error: "Enter your hourly rate as a number." })
    .int("Use whole naira, with no decimals.")
    .positive("Enter an hourly rate greater than zero.")
    .max(HOURLY_RATE_MAX, "That rate is above the maximum we allow."),

  yearsOfExperience: z.coerce
    .number({ error: "Enter your years of experience as a number." })
    .int("Use whole years, with no decimals.")
    .min(0, "Experience cannot be negative.")
    .max(YEARS_MAX, `Enter ${YEARS_MAX} years or fewer.`),
});

export type TutorProfileInput = z.infer<typeof tutorProfileSchema>;

/**
 * Weights for the completeness meter shown on the form.
 *
 * `location`, `hourlyRate` and `yearsOfExperience` are required, so they always
 * contribute. The meter therefore measures the two optional fields that actually
 * decide whether a profile is presentable, which is why it starts at 50.
 *
 * **Scope: this milestone only.** These are the five editable `tutor_profiles`
 * columns, so 100 means "your basic details are filled in" and nothing more. It
 * does not mean the tutor is discoverable: `tutor_subjects` rows, which carry the
 * subjects and education levels the matching engine ranks on, are managed in a
 * later milestone and contribute nothing here. The form's wording says so, and
 * `profile_completeness` must not be read as a search-readiness signal.
 */
const COMPLETENESS_WEIGHTS = {
  location: 20,
  hourlyRate: 15,
  yearsOfExperience: 15,
  headline: 20,
  bio: 30,
} as const;

/**
 * Derive `profile_completeness` from data that has already been validated.
 *
 * The column is writable by tutors in the Phase 4 grants, so leaving it to the
 * form would let any account claim 100%. Computing it here means the stored
 * value is always a function of the profile's real contents.
 *
 * Takes the parsed input rather than `FormData` so it cannot be called with
 * unvalidated data.
 */
export function deriveProfileCompleteness(input: TutorProfileInput): number {
  const score =
    COMPLETENESS_WEIGHTS.location +
    COMPLETENESS_WEIGHTS.hourlyRate +
    COMPLETENESS_WEIGHTS.yearsOfExperience +
    (input.headline ? COMPLETENESS_WEIGHTS.headline : 0) +
    (input.bio ? COMPLETENESS_WEIGHTS.bio : 0);

  return Math.min(100, score);
}
