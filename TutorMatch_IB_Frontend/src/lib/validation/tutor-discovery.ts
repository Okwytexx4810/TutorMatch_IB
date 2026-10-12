/**
 * Mapping between the discovery URL (`?subject=&location=&minRate=&maxRate=&
 * level=&day=&period=&page=`) and the typed filters the query layer accepts.
 *
 * Pure, dependency-free (aside from shared vocabularies) so Vitest can cover
 * every branch without a database.
 */
import { resolveIbadanLocation, type IbadanLocation } from "@/lib/locations";
import {
  DAY_PERIODS,
  EDUCATION_LEVELS,
  WEEK_DAYS,
  type DayPeriod,
  type EducationLevel,
  type WeekDay,
} from "@/types/domain";

/** Cards per result page. 9 renders a full 3x3 grid before paging. */
export const TUTORS_PER_PAGE = 9;

/** Upper bound for both budget inputs; mirrors the hourly rate cap. */
export const DISCOVERY_MAX_RATE = 1_000_000;

export interface TutorDiscoveryFilters {
  /** Normalised to the subject spelling a tutor actually uses. */
  subject: string | null;
  /** Matches `tutor_subjects.level` exactly. */
  level: EducationLevel | null;
  /** Only one of the 26 approved Ibadan locations; invalid values are dropped. */
  location: IbadanLocation | null;
  minRate: number | null;
  maxRate: number | null;
  /**
   * Availability filter. `period` is only honoured together with `day`; a day
   * alone matches any period.
   */
  day: WeekDay | null;
  period: DayPeriod | null;
}

export const EMPTY_TUTOR_DISCOVERY_FILTERS: TutorDiscoveryFilters = {
  subject: null,
  level: null,
  location: null,
  minRate: null,
  maxRate: null,
  day: null,
  period: null,
};

export interface TutorDiscoverySearch {
  filters: TutorDiscoveryFilters;
  /** 1-based. Malformed values fall back to 1. */
  page: number;
}

/** Non-empty string, trimmed; everything else is `null`. */
function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Whole-naira amount in `0..DISCOVERY_MAX_RATE`; anything else is `null`. */
function readRate(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > DISCOVERY_MAX_RATE) return null;
  return parsed;
}

function isEducationLevel(value: string): value is EducationLevel {
  return (EDUCATION_LEVELS as readonly string[]).includes(value);
}

function isWeekDay(value: string): value is WeekDay {
  return (WEEK_DAYS as readonly string[]).includes(value);
}

function isDayPeriod(value: string): value is DayPeriod {
  return (DAY_PERIODS as readonly string[]).includes(value);
}

/**
 * Parse a `searchParams` object into filters + page.
 *
 * Invalid or malformed values are dropped per field rather than failing the
 * whole request, so a hand-edited or out-dated URL still renders a valid page
 * (showing fewer filters rather than an error). Two pairs are cross-checked:
 * a `minRate` above `maxRate` nulls both, and a `period` without a `day` is
 * dropped because availability is matched per day.
 */
export function parseTutorDiscoverySearchParams(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
): TutorDiscoverySearch {
  const single = (key: string): string | null => {
    const value = searchParams[key];
    return typeof value === "string" ? value : null;
  };

  const level = single("level");
  const day = single("day");
  const period = single("period");

  let minRate = readRate(single("minRate"));
  let maxRate = readRate(single("maxRate"));
  if (minRate !== null && maxRate !== null && minRate > maxRate) {
    minRate = null;
    maxRate = null;
  }

  const filters: TutorDiscoveryFilters = {
    subject: readString(single("subject")),
    level: level && isEducationLevel(level) ? level : null,
    location: resolveIbadanLocation(readString(single("location")) ?? ""),
    minRate,
    maxRate,
    day: day && isWeekDay(day) ? day : null,
    period:
      day && period && isDayPeriod(period) ? period : null,
  };

  const rawPage = Number(single("page"));
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  return { filters, page };
}

/** Whether the user has narrowed results at all (used to show "Clear filters"). */
export function discoveryHasFilters(filters: TutorDiscoveryFilters): boolean {
  return (Object.values(filters) as Array<string | number | null>).some(
    (value) => value !== null,
  );
}

/**
 * The discovery href for a filter set + page, preserving every active filter
 * across pagination. `null` filters are omitted. Returns `?`-less base when no
 * param survives.
 */
export function buildDiscoveryHref(
  filters: TutorDiscoveryFilters,
  page = 1,
): string {
  const params = new URLSearchParams();
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.level) params.set("level", filters.level);
  if (filters.location) params.set("location", filters.location);
  if (filters.minRate !== null) params.set("minRate", String(filters.minRate));
  if (filters.maxRate !== null) params.set("maxRate", String(filters.maxRate));
  if (filters.day) params.set("day", filters.day);
  if (filters.period) params.set("period", filters.period);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}