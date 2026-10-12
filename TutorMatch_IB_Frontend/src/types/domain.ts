/**
 * Core domain vocabulary for TutorMatch IB.
 *
 * These types are the shared contract between the database layer, the
 * matching engine, the OpenAI extraction layer and the UI. They are
 * intentionally free of any Supabase or Next.js imports so they can be used
 * from any layer.
 */

/** Platform roles. A single user may hold more than one. */
export const USER_ROLES = ["student", "parent", "tutor", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Row shape of the database-backed `tutor_profiles` table.
 *
 * This is the write model for the tutor profile form, and deliberately NOT
 * `TutorProfile` from `types/tutor.ts`, which is the richer read model the
 * matching engine consumes (it adds subjects, availability and ratings).
 *
 * `is_verified` is present because reads need it, and is never writable by the
 * account holder: it is absent from the `INSERT` and `UPDATE` column grants in
 * the Phase 4 migration, so no tutor can set it.
 */
export interface TutorProfileRecord {
  id: string;
  /** Owner. Always the authenticated user; never accepted from a form. */
  profile_id: string;
  /**
   * Public display name. Optional; discovery falls back to `headline` when it
   * is null. Provided by the Stage B migration; reads tolerate its absence.
   */
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string;
  hourly_rate: number;
  years_of_experience: number;
  /** Moderation decision. Read-only for tutors. */
  is_verified: boolean;
  /** 0-100. Derived on the server from submitted data, never client-supplied. */
  profile_completeness: number;
  created_at: string;
  updated_at: string;
}

/**
 * Row shape of the database-backed `profiles` table.
 *
 * `role` here is the *trusted* application role: it is written once by the
 * `handle_new_user()` trigger, is not updatable by the account holder, and is
 * the only role value the server authorises against. Anything read from
 * `user_metadata` is presentation data, never a permission.
 */
export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Canonical teaching levels used across search, matching and AI extraction. */
export const EDUCATION_LEVELS = [
  "primary",
  "jss",
  "sss",
  "waec",
  "neco",
  "nce",
  "undergraduate",
  "postgraduate",
  "adult",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/** Delivery modes a tutor can offer. */
export const TEACHING_MODES = ["in_person", "online", "hybrid"] as const;

export type TeachingMode = (typeof TEACHING_MODES)[number];

/** Days of the week, ordered Monday -> Sunday. */
export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

/** Broad time-of-day buckets used by the availability selector. */
export const DAY_PERIODS = ["morning", "afternoon", "evening"] as const;

export type DayPeriod = (typeof DAY_PERIODS)[number];

/** A single requested day + period combination. */
export interface AvailabilitySlot {
  day: WeekDay;
  period: DayPeriod;
}

/**
 * The structured requirement shape produced from a student's natural language
 * description. OpenAI extracts these fields; it never populates them with
 * tutor data. The matching engine consumes them.
 */
export interface MatchingRequirements {
  subject?: string;
  level?: EducationLevel;
  location?: string;
  availability?: AvailabilitySlot[];
  budget?: number;
  teachingMode?: TeachingMode;
  minExperienceYears?: number;
  /** Free-text nuance kept for display and for re-prompting. */
  notes?: string;
}

/** Weights for the deterministic matching engine. Must sum to 100. */
export const MATCH_WEIGHTS = {
  subject: 35,
  location: 20,
  availability: 20,
  budget: 15,
  experience: 10,
} as const;

export type MatchCriterion = keyof typeof MATCH_WEIGHTS;

/** Per-criterion outcome for a single tutor, used to explain the score. */
export interface MatchBreakdownEntry {
  criterion: MatchCriterion;
  /** Points earned by this tutor on this criterion. */
  score: number;
  /** Maximum points available for this criterion. */
  maxScore: number;
  /** Human-readable justification derived from real database values. */
  reason: string;
}

/** A scored tutor with a full, explainable breakdown. */
export interface TutorMatch {
  tutorId: string;
  /** 0-100, produced by the matching engine only. */
  matchScore: number;
  breakdown: MatchBreakdownEntry[];
}
