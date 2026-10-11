import { getServerSupabase } from "@/lib/supabase/server";
import { normalize } from "@/lib/utils/format";
import type { EducationLevel } from "@/types/domain";
import type { TutorSummary } from "@/types/tutor";

/**
 * Read helpers for tutor discovery.
 *
 * Server-only by convention, per `lib/supabase/README.md`. All reads run as the
 * anonymous or signed-in caller through `getServerSupabase`, so they are bound
 * by RLS: `tutor_profiles`, `tutor_subjects` and `tutor_ratings` are the three
 * publicly readable tutor surfaces, and `profiles` is deliberately excluded
 * because it has no public read policy.
 *
 * The Supabase client is untyped until a `Database` type is generated, so each
 * query asserts a narrow row shape against the columns listed in the migration.
 */

/** Columns used to build a `TutorSummary` card. */
const TUTOR_CARD_SELECT =
  "id, headline, bio, location, hourly_rate, years_of_experience, is_verified, tutor_subjects ( subject, level )";

interface TutorCardRow {
  id: string;
  headline: string | null;
  bio: string | null;
  location: string;
  hourly_rate: number;
  years_of_experience: number;
  is_verified: boolean;
  tutor_subjects: Array<{ subject: string; level: string }> | null;
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

export interface TutorDiscoveryResult {
  /** Full summaries for the matching tutors, oldest profile first. */
  tutors: TutorSummary[];
  /**
   * Distinct subjects offered by any tutor, for the filter dropdown. Sorted
   * so the select renders a stable list.
   */
  subjects: string[];
  /** Presence of an error. The message is for the server log only. */
  isError: boolean;
  /** Server-side detail; never rendered to visitors. */
  errorMessage: string | null;
}

/**
 * All publicly readable tutors, optionally narrowed by subject.
 *
 * Subject narrowing happens in memory: PostgREST embedded filters on the
 * one-to-many `tutor_subjects` relation do not exclude parents, so a `?subject=`
 * filter cannot be pushed into the query without a second round trip. The tutor
 * set is small by design (a few dozen seed rows), so in-memory filtering is
 * reliable and keeps this phase simple.
 */
export async function getTutorSummaries(filter?: {
  subject?: string;
}): Promise<TutorDiscoveryResult> {
  const failure = (message: string): TutorDiscoveryResult => ({
    tutors: [],
    subjects: [],
    isError: true,
    errorMessage: message,
  });

  const supabase = await getServerSupabase();

  const [tutorResult, ratingResult] = await Promise.all([
    supabase
      .from("tutor_profiles")
      .select(TUTOR_CARD_SELECT)
      .order("created_at", { ascending: true }),
    supabase
      .from("tutor_ratings")
      .select("tutor_id, average_rating, review_count"),
  ]);

  if (tutorResult.error) {
    return failure(tutorResult.error.message);
  }

  if (ratingResult.error) {
    return failure(ratingResult.error.message);
  }

  const ratings = new Map(
    (ratingResult.data as TutorRatingRow[] | null)?.map((row) => [
      row.tutor_id,
      row,
    ]) ?? [],
  );

  const requested = filter?.subject ? normalize(filter.subject) : null;
  const subjectSet = new Set<string>();

  const tutors = ((tutorResult.data as TutorCardRow[] | null) ?? []).flatMap(
    (row) => {
      const rowSubjects = (row.tutor_subjects ?? []).map(
        (entry) => entry.subject,
      );
      const subjects = Array.from(new Set(rowSubjects));
      const levels = Array.from(
        new Set(
          (row.tutor_subjects ?? []).map((entry) => entry.level),
        ),
      ) as EducationLevel[];

      for (const subject of subjects) subjectSet.add(subject);

      if (requested && !subjects.some((subject) => normalize(subject) === requested)) {
        return [];
      }

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
          // `profiles` has no public read policy, so a tutor's full name and
          // avatar are currently unobtainable through RLS. `headline` is shown
          // as a stand-in by TutorCard until schema provides a display name.
          fullName: "",
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
    },
  );

  return {
    tutors,
    subjects: Array.from(subjectSet).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    ),
    isError: false,
    errorMessage: null,
  };
}