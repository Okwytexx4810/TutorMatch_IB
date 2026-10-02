/** Small, dependency-free helpers shared across the app. */

/** Currency formatting for naira amounts. */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** `true` for non-empty, trimmed strings. Used to guard optional text inputs. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Compare two strings without regard to case or surrounding whitespace.
 * Used by the matching engine when comparing subject and location names.
 */
export function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Cap a number to the inclusive `0..100` range used by match scores. */
export function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Format an ISO date string as a readable, locale-aware date. */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(isoDate));
}

/** Format an ISO date string as a readable time, e.g. `4:30 PM`. */
export function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeStyle: "short",
  }).format(new Date(isoDate));
}
