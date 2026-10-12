/**
 * Compatibility helpers for reading and writing optional columns.
 *
 * A prepared migration (`20261011000000_stage_b_tutor_discovery.sql`) adds
 * `tutor_profiles.display_name`. Until that migration is applied to a given
 * environment, selecting or writing that column fails. Rather than breaking
 * discovery or the tutor profile form, the data layer attempts the richer
 * statement and, on a missing-column error only, retries without it. Once the
 * migration is applied, the fallback never runs.
 *
 * This deliberately narrows the retry to missing-column errors. Any other
 * failure (permissions, constraints, network) is still surfaced as a real
 * error, so a genuine problem is never silently swallowed.
 */

/** Postgres `undefined_column` and PostgREST's schema-cache miss. */
const MISSING_COLUMN_CODES = new Set(["42703", "PGRST204"]);

interface SupabaseLikeError {
  code?: string;
  message?: string;
}

/**
 * Whether `error` indicates that `column` does not exist in the target schema.
 *
 * @param error A Supabase/PostgREST error object, or `null`.
 * @param column The column name expected to be missing.
 */
export function isMissingColumnError(
  error: SupabaseLikeError | null | undefined,
  column: string,
): boolean {
  if (!error) return false;

  if (error.code && MISSING_COLUMN_CODES.has(error.code)) return true;

  const message = error.message ?? "";
  return (
    message.includes(column) &&
    /(does not exist|could not find)/i.test(message)
  );
}

/**
 * Whether a Supabase error is a unique-violation (HTTP 409 / SQLSTATE 23505).
 *
 * Used by the request/booking actions to turn the partial unique index on
 * pending requests into a friendly "you already asked this tutor" message.
 */
export function isUniqueViolationError(
  error: SupabaseLikeError | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key value violates unique constraint/i.test(
    error.message ?? "",
  );
}

/**
 * Whether a Supabase error is an exclusion-constraint violation (SQLSTATE 23P01).
 *
 * The `no_overlapping_bookings` GiST constraint raises this code when a tutor
 * is double-booked.
 */
export function isExclusionViolationError(
  error: SupabaseLikeError | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "23P01") return true;
  return /conflicting key value violates exclusion constraint/i.test(
    error.message ?? "",
  );
}

/**
 * Whether a Supabase error is the booking-time rejection raised by the
 * Stage C1 `prepare_booking` trigger (custom SQLSTATE P0002).
 *
 * The trigger refuses bookings whose `starts_at` is not strictly in the future,
 * mirroring the frontend's `bookingWindowSchema` so a client clock mismatch (or
 * a forged request) still surfaces a clear message.
 */
export function isBookingStartInPastError(
  error: SupabaseLikeError | null | undefined,
): boolean {
  return error?.code === "P0002";
}

/**
 * Whether a Supabase error is the "tutor profile missing" rejection from the
 * Stage C1 `prepare_booking` trigger (custom SQLSTATE P0003).
 *
 * This exists so a deleted tutor surfaces as a friendly "tutor is gone" message
 * instead of a bare foreign-key constraint error.
 */
export function isBookingTutorMissingError(
  error: SupabaseLikeError | null | undefined,
): boolean {
  return error?.code === "P0003";
}
