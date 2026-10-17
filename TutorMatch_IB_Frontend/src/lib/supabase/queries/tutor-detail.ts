import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/compat";
import {
  DAY_PERIODS,
  WEEK_DAYS,
  type DayPeriod,
  type EducationLevel,
  type WeekDay,
} from "@/types/domain";
import type {
  TutorAvailabilitySlot,
  TutorProfile,
  TutorQualification,
} from "@/types/tutor";

/**
 * Read helper for the single-tutor profile page.
 *
 * Runs as the anonymous or signed-in caller, so it is bound by the four public
 * surfaces (`tutor_profiles`, `tutor_subjects`, `tutor_qualifications`,
 * `tutor_availability`, `reviews`); `profiles` is deliberately excluded because
 * it has no public read policy. Page-level fetch, so only ever called with one
 * id from the marketing detail route.
 */

const TUTOR_DETAIL_SELECT =
  "id, display_name, headline, bio, location, hourly_rate, years_of_experience, is_verified, created_at, tutor_subjects ( subject, level ), tutor_qualifications ( id, title, institution, year ), tutor_availability ( id, day, period, start_time, is_active )";
const TUTOR_DETAIL_SELECT_BASE =
  "id, headline, bio, location, hourly_rate, years_of_experience, is_verified, created_at, tutor_subjects ( subject, level ), tutor_qualifications ( id, title, institution, year ), tutor_availability ( id, day, period, start_time, is_active )";

export interface TutorReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface TutorOffering {
  subject: string;
  level: EducationLevel;
}

export interface TutorDetailResult {
  tutor: TutorProfile | null;
  /** Real subject+level pairs from `tutor_subjects`, not a cartesian product. */
  offerings: TutorOffering[];
  reviews: TutorReviewRow[];
  isError: boolean;
  /** Server-side detail; never rendered to visitors. */
  errorMessage: string | null;
}

const WEEK_DAY_INDEX = new Map<WeekDay, number>(
  WEEK_DAYS.map((day, index) => [day, index]),
);
const DAY_PERIOD_INDEX = new Map<DayPeriod, number>(
  DAY_PERIODS.map((period, index) => [period, index]),
);

/**
 * A `start_time` arrives from PostgREST as `"HH:MM:SS"`; `TutorAvailabilitySlot`
 * documents `HH:mm`, so the seconds are dropped.
 */
function shortTime(time: string): string {
  return time.slice(0, 5);
}

export async function getTutorProfileById(
  tutorId: string,
): Promise<TutorDetailResult> {
  const failure = (message: string): TutorDetailResult => ({
    tutor: null,
    offerings: [],
    reviews: [],
    isError: true,
    errorMessage: message,
  });

  const supabase = await getServerSupabase();

  const buildQuery = (includeDisplayName: boolean) => {
    // Typed `string` so the two column sets yield the same builder type instead
    // of a select-literal union that PostgREST's parser can't collapse.
    const columns: string = includeDisplayName
      ? TUTOR_DETAIL_SELECT
      : TUTOR_DETAIL_SELECT_BASE;
    return supabase
      .from("tutor_profiles")
      .select(columns)
      .eq("id", tutorId)
      .maybeSingle();
  };

  let tutorResult = await buildQuery(true);

  // Pre-migration fallback, mirroring `getTutorSummaries`.
  if (
    tutorResult.error &&
    isMissingColumnError(tutorResult.error, "display_name")
  ) {
    tutorResult = await buildQuery(false);
  }

  if (tutorResult.error) return failure(tutorResult.error.message);

  if (!tutorResult.data) {
    return {
      tutor: null,
      offerings: [],
      reviews: [],
      isError: false,
      errorMessage: null,
    };
  }

  const [ratingResult, reviewResult] = await Promise.all([
    supabase
      .from("tutor_ratings")
      .select("tutor_id, average_rating, review_count")
      .eq("tutor_id", tutorId)
      .maybeSingle(),
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("tutor_id", tutorId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Ratings and reviews are display-only. A failure there must not hide the
  // profile or the request form.

  const row = tutorResult.data as unknown as {
    id: string;
    display_name?: string | null;
    headline: string | null;
    bio: string | null;
    location: string;
    hourly_rate: number;
    years_of_experience: number;
    is_verified: boolean;
    tutor_subjects: Array<{ subject: string; level: EducationLevel }> | null;
    tutor_qualifications: Array<{
      id: string;
      title: string;
      institution: string | null;
      year: number | null;
    }> | null;
    tutor_availability: Array<{
      day: WeekDay;
      period: DayPeriod;
      start_time: string | null;
      is_active: boolean;
    }> | null;
  };

  const offerings: TutorOffering[] = (row.tutor_subjects ?? []).map((entry) => ({
    subject: entry.subject,
    level: entry.level,
  }));
  const subjects = Array.from(
    new Set(offerings.map((entry) => entry.subject)),
  );
  const levels = Array.from(
    new Set((row.tutor_subjects ?? []).map((entry) => entry.level)),
  );

  const qualifications: TutorQualification[] = (row.tutor_qualifications ?? [])
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      institution: entry.institution ?? undefined,
      year: entry.year ?? undefined,
    }))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  const availability: TutorAvailabilitySlot[] = (row.tutor_availability ?? [])
    .map((entry) => ({
      day: entry.day,
      period: entry.period,
      startTime: entry.start_time ? shortTime(entry.start_time) : undefined,
      isActive: entry.is_active,
    }))
    .sort(
      (a, b) =>
        (WEEK_DAY_INDEX.get(a.day) ?? 0) - (WEEK_DAY_INDEX.get(b.day) ?? 0) ||
        (DAY_PERIOD_INDEX.get(a.period) ?? 0) -
          (DAY_PERIOD_INDEX.get(b.period) ?? 0),
    );

  const rating = (ratingResult.error ? null : ratingResult.data) as
    | { tutor_id: string; average_rating: number | string; review_count: number }
    | null
    | undefined;

  const rawRating = rating?.average_rating;
  const averageRating =
    rawRating !== null &&
    rawRating !== undefined &&
    Number.isFinite(Number(rawRating))
      ? Number(rawRating)
      : null;

  const tutor = {
    id: row.id,
    fullName: row.display_name?.trim() ?? "",
    headline: row.headline ?? undefined,
    bio: row.bio ?? undefined,
    location: row.location,
    subjects,
    teachingModes: [],
    educationLevels: levels,
    hourlyRate: row.hourly_rate,
    yearsOfExperience: row.years_of_experience,
    isVerified: row.is_verified,
    averageRating,
    reviewCount: rating?.review_count ?? 0,
    qualifications,
    availability,
  } satisfies TutorProfile;

  return {
    tutor,
    offerings,
    reviews: reviewResult.error
      ? []
      : ((reviewResult.data as TutorReviewRow[] | null | undefined) ?? []),
    isError: false,
    errorMessage: null,
  };
}