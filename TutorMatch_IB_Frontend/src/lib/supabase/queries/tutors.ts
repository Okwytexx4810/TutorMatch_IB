import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/compat";
import { SUBJECTS } from "@/lib/subjects";
import { normalize } from "@/lib/utils/format";
import {
  TUTORS_PER_PAGE,
  type TutorDiscoverySearch,
} from "@/lib/validation/tutor-discovery";
import type { DayPeriod, EducationLevel, WeekDay } from "@/types/domain";
import type { TutorSummary } from "@/types/tutor";

/**
 * Read helpers for tutor discovery.
 *
 * Server-only by convention, per `lib/supabase/README.md`. All reads run as the
 * anonymous or signed-in caller through `getServerSupabase`, so they are bound
 * by RLS: `tutor_profiles`, `tutor_subjects`, `tutor_availability` and
 * `tutor_ratings` are the four publicly readable tutor surfaces, and `profiles`
 * is deliberately excluded because it has no public read policy.
 *
 * Caveat on in-memory filtering: PostgREST cannot express "the parent has an
 * embedded row matching X" against a one-to-many relation (an embedded filter
 * narrows the children, it never excludes the parent). Subject, level and
 * availability are therefore filtered here in JavaScript. For the live dataset
 * — a few dozen tutors at most — this is reliable, and the scalar filters
 * (location, rate) genuinely run in Postgres. If the catalogue grows large,
 * this function is the single place to replace with an RPC.
 */

/** Columns used to build a `TutorSummary` card, including the Stage B name. */
const TUTOR_CARD_SELECT =
  "id, display_name, headline, bio, location, hourly_rate, years_of_experience, is_verified, tutor_subjects ( subject, level )";
/** Same, for environments where the `display_name` migration is not applied. */
const TUTOR_CARD_SELECT_BASE =
  "id, headline, bio, location, hourly_rate, years_of_experience, is_verified, tutor_subjects ( subject, level )";

interface TutorCardRow {
  id: string;
  display_name?: string | null;
  headline: string | null;
  bio: string | null;
  location: string;
  hourly_rate: number;
  years_of_experience: number;
  is_verified: boolean;
  tutor_subjects: Array<{ subject: string; level: EducationLevel }> | null;
}

interface TutorRatingRow {
  tutor_id: string;
  /**
   * PostgREST serialises `numeric` columns as JSON strings, so a rating arrives
   * as either a number or a numeric string. Coerced with `Number()` below.
   */
  average_rating: number | string;
  review_count: number;
}

interface TutorAvailabilityRow {
  tutor_id: string;
  day: WeekDay;
  period: DayPeriod;
  is_active: boolean;
}

export interface TutorDiscoveryResult {
  /** Full summaries for the current page, oldest profile first. */
  tutors: TutorSummary[];
  /**
   * Distinct subjects offered by any tutor, for the filter dropdown — computed
   * before filters narrow the page, so the list stays stable under filtering.
   */
  subjects: string[];
  /** Matching tutors across all pages (exact, derived server-side). */
  total: number;
  page: number;
  pageSize: number;
  /** Presence of an error. The message is for the server log only. */
  isError: boolean;
  /** Server-side detail; never rendered to visitors. */
  errorMessage: string | null;
}

/**
 * All publicly readable tutors, narrowed by the discovery filters.
 *
 * Scalar filters (`location`, `minRate`, `maxRate`) run in Postgres. Relational
 * filters (`subject`, `level`, `day`/`period`) and pagination are applied here
 * (see the caveat above), so `total` is the exact post-filter count.
 */
export async function getTutorSummaries(
  search: TutorDiscoverySearch,
): Promise<TutorDiscoveryResult> {
  const { filters, page } = search;

  const failure = (message: string): TutorDiscoveryResult => ({
    tutors: [],
    subjects: [],
    total: 0,
    page,
    pageSize: TUTORS_PER_PAGE,
    isError: true,
    errorMessage: message,
  });

  const supabase = await getServerSupabase();

  const buildQuery = (includeDisplayName: boolean) => {
    // Typed `string` so the two column sets yield the same builder type instead
    // of a select-literal union that PostgREST's parser can't collapse.
    const columns: string = includeDisplayName
      ? TUTOR_CARD_SELECT
      : TUTOR_CARD_SELECT_BASE;
    let query = supabase
      .from("tutor_profiles")
      .select(columns)
      .order("created_at", { ascending: true });

    if (filters.location) query = query.eq("location", filters.location);
    if (filters.minRate !== null) query = query.gte("hourly_rate", filters.minRate);
    if (filters.maxRate !== null) query = query.lte("hourly_rate", filters.maxRate);

    return query;
  };

  let tutorResult = await buildQuery(true);

  // Pre-migration environments have no `display_name` column. Retry once without
  // it so discovery keeps working against the base schema.
  if (tutorResult.error && isMissingColumnError(tutorResult.error, "display_name")) {
    tutorResult = await buildQuery(false);
  }

  if (tutorResult.error) return failure(tutorResult.error.message);

  const [ratingResult, availabilityResult] = await Promise.all([
    supabase
      .from("tutor_ratings")
      .select("tutor_id, average_rating, review_count"),
    filters.day
      ? supabase
          .from("tutor_availability")
          .select("tutor_id, day, period, is_active")
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (ratingResult.error) return failure(ratingResult.error.message);
  if (availabilityResult.error) return failure(availabilityResult.error.message);

  const ratings = new Map(
    (ratingResult.data as TutorRatingRow[] | null | undefined)?.map((row) => [
      row.tutor_id,
      row,
    ]) ?? [],
  );

  // Which tutors are available for the requested day/period, keyed by tutor id.
  const activeOnDay = new Set<string>();
  if (filters.day) {
    const rows = availabilityResult.data as
      | TutorAvailabilityRow[]
      | null
      | undefined;
    for (const row of rows ?? []) {
      if (row.day !== filters.day || !row.is_active) continue;
      if (filters.period !== null && row.period !== filters.period) continue;
      activeOnDay.add(row.tutor_id);
    }
  }

  const rows = (tutorResult.data as unknown as TutorCardRow[] | null | undefined) ?? [];

  // Subject dropdown: the curated vocabulary, plus every subject any tutor
  // offers, regardless of the active filters — so the select always shows all
  // available subjects and never loses an option while filtering.
  const subjectSet = new Set<string>(SUBJECTS);
  const tutors = rows.flatMap((row) => {
    const entries = row.tutor_subjects ?? [];
    const subjects = Array.from(new Set(entries.map((entry) => entry.subject)));
    const levels = Array.from(
      new Set(entries.map((entry) => entry.level)),
    );

    for (const subject of subjects) subjectSet.add(subject);

    // Relational filters can't be pushed to PostgREST; applied here.
    if (search.filters.subject) {
      const requested = normalize(search.filters.subject);
      if (!subjects.some((subject) => normalize(subject) === requested)) {
        return [];
      }
    }
    if (filters.level && !levels.includes(filters.level)) return [];
    if (filters.day && !activeOnDay.has(row.id)) return [];

    const rating = ratings.get(row.id);
    const rawRating = rating?.average_rating;
    const averageRating =
      rawRating !== null &&
      rawRating !== undefined &&
      Number.isFinite(Number(rawRating))
        ? Number(rawRating)
        : null;

    return [
      {
        id: row.id,
        // `profiles` has no public read policy, so discovery cannot join to a
        // full name. The Stage B `display_name` column is the presentation name;
        // when it, or the column, is absent the card falls back to `headline`.
        fullName: row.display_name?.trim() ?? "",
        headline: row.headline ?? undefined,
        bio: row.bio ?? undefined,
        location: row.location,
        subjects,
        // No column in the current schema stores teaching modes.
        teachingModes: [],
        educationLevels: levels,
        hourlyRate: row.hourly_rate,
        yearsOfExperience: row.years_of_experience,
        isVerified: row.is_verified,
        averageRating,
        reviewCount: rating?.review_count ?? 0,
      } satisfies TutorSummary,
    ];
  });

  const total = tutors.length;
  const pageSize = TUTORS_PER_PAGE;
  const start = (page - 1) * pageSize;
  const pageTutors = total >= 0 ? tutors.slice(start, start + pageSize) : [];

  return {
    tutors: pageTutors,
    subjects: Array.from(subjectSet).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    ),
    total,
    page,
    pageSize,
    isError: false,
    errorMessage: null,
  };
}