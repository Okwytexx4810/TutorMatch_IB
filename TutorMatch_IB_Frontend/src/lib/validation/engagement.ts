/**
 * Validation and transition rules for the request/booking workflow.
 *
 * Pure and dependency-free apart from shared vocabularies, so Vitest can cover
 * every branch without a database. The request schema mirrors
 * `tutor-profile.ts`: it validates the server action's `FormData` and produces
 * the typed object the data layer writes, so the form and the write can never
 * disagree about what is valid.
 */
import { z } from "zod";

import { resolveIbadanLocation, type IbadanLocation } from "@/lib/locations";
import {
  DAY_PERIODS,
  EDUCATION_LEVELS,
  WEEK_DAYS,
  type DayPeriod,
  type WeekDay,
} from "@/types/domain";
import type { BookingStatus, RequestStatus } from "@/types/engagement";

export const REQUEST_MESSAGE_MAX = 2000;
export const REQUEST_SUBJECT_MAX = 120;
/** Mirrors the hourly-rate and discovery caps: whole naira, bounded. */
export const REQUEST_BUDGET_MAX = 1_000_000;

/** Optional text that becomes SQL `NULL` when left blank. */
function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value.length > 0 ? value : null));
}

/** Whole-naira amount; blank reads as `null` (no budget on the request). */
function optionalInteger(max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.coerce
      .number({ error: "Enter your budget as a number." })
      .int("Use whole naira, with no decimals.")
      .min(0, "Budget cannot be negative.")
      .max(max, "That budget is above the maximum we allow.")
      .nullable(),
  );
}

/**
 * A new tutor request.
 *
 * `tutorId` is a reference, not an authority: the mutation re-reads the tutor
 * and their offerings from the session and the database. `level` is restricted
 * to the canonical `EDUCATION_LEVELS` vocabulary, `location` to the approved
 * Ibadan list (resolved to its canonical spelling), and the preferred slot is
 * a single `day`+`period` pair from the shared availability vocabulary.
 */
export const tutorRequestSchema = z.strictObject({
  tutorId: z.string().uuid("That tutor id is not valid."),

  subject: z.string().trim().min(1, "Choose a subject.").max(
    REQUEST_SUBJECT_MAX,
    `Keep the subject under ${REQUEST_SUBJECT_MAX} characters.`,
  ),

  level: z.enum(EDUCATION_LEVELS, { error: "Choose an education level." }),

  location: z
    .string()
    .trim()
    .transform((value) => resolveIbadanLocation(value))
    .refine((value): value is IbadanLocation => value !== null, {
      message: "Select one of the approved Ibadan locations.",
    }),

  day: z.enum(WEEK_DAYS, { error: "Choose a preferred day." }),

  period: z.enum(DAY_PERIODS, { error: "Choose a preferred time of day." }),

  message: optionalText(
    REQUEST_MESSAGE_MAX,
    `Keep your message under ${REQUEST_MESSAGE_MAX} characters.`,
  ),

  budget: optionalInteger(REQUEST_BUDGET_MAX),
});

export type TutorRequestInput = z.infer<typeof tutorRequestSchema>;

/**
 * Who an engagement is addressed from. Drives which transitions are legal.
 * `admin` is the administrator console's moderator: it can triage any
 * application and manage any booking, without being a party to either.
 */
export type EngagementActor = "requester" | "tutor" | "admin";

/**
 * The only state transitions each party may perform on a request:
 * a requester can withdraw their own pending request; only the addressed tutor
 * can accept or decline it, and only while it is still pending; an
 * administrator can triage any application. These maps mirror the RLS
 * transition policies in the Stage C migration and the admin-console policy.
 */
export const REQUEST_ACTOR_TRANSITIONS: Record<
  EngagementActor,
  Record<RequestStatus, readonly RequestStatus[]>
> = {
  requester: {
    pending: ["cancelled"],
    accepted: [],
    declined: [],
    cancelled: [],
  },
  tutor: {
    pending: ["accepted", "declined"],
    accepted: [],
    declined: [],
    cancelled: [],
  },
  admin: {
    pending: ["accepted", "declined", "cancelled"],
    accepted: ["cancelled"],
    declined: [],
    cancelled: [],
  },
};

/**
 * The only state transitions each party may perform on a booking. Confirmed
 * bookings may be downgraded to `cancelled` by either party or `completed` by
 * the tutor; an administrator may also mark a confirmed booking `no_show`.
 * `completed`, `cancelled` and `no_show` rows are terminal from the client.
 * The party maps mirror the `bookings_state_changes` policy; the admin map
 * mirrors the `bookings_admin_update` policy.
 */
export const BOOKING_ACTOR_TRANSITIONS: Record<
  EngagementActor,
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  requester: {
    confirmed: ["cancelled"],
    completed: [],
    cancelled: [],
    no_show: [],
  },
  tutor: {
    confirmed: ["cancelled", "completed"],
    completed: [],
    cancelled: [],
    no_show: [],
  },
  admin: {
    confirmed: ["completed", "cancelled", "no_show"],
    completed: [],
    cancelled: [],
    no_show: [],
  },
};

/** Whether `from -> to` is a legal change for this actor on a request. */
export function canTransitionRequest(
  from: RequestStatus,
  to: RequestStatus,
  actor: EngagementActor,
): boolean {
  return REQUEST_ACTOR_TRANSITIONS[actor][from].includes(to);
}

/** Whether `from -> to` is a legal change for this actor on a booking. */
export function canTransitionBooking(
  from: BookingStatus,
  to: BookingStatus,
  actor: EngagementActor,
): boolean {
  return BOOKING_ACTOR_TRANSITIONS[actor][from].includes(to);
}

const REQUEST_TRANSITION_HINTS: Record<EngagementActor, string> = {
  requester: "Only a pending request can be cancelled.",
  tutor: "Only a pending request can be accepted or declined.",
  admin: "Only a pending application can be managed, and only an accepted one can be closed.",
};

const BOOKING_TRANSITION_HINTS: Record<EngagementActor, string> = {
  requester: "Only a confirmed booking can be cancelled.",
  tutor: "Only a confirmed booking can be cancelled or completed.",
  admin: "Only a confirmed booking can be managed.",
};

/** A safe message for an illegal request transition, or `null` when legal. */
export function requestTransitionFailure(
  from: RequestStatus,
  to: RequestStatus,
  actor: EngagementActor,
): string | null {
  if (canTransitionRequest(from, to, actor)) return null;
  return REQUEST_TRANSITION_HINTS[actor];
}

/** A safe message for an illegal booking transition, or `null` when legal. */
export function bookingTransitionFailure(
  from: BookingStatus,
  to: BookingStatus,
  actor: EngagementActor,
): string | null {
  if (canTransitionBooking(from, to, actor)) return null;
  return BOOKING_TRANSITION_HINTS[actor];
}

/** Edge value a schedule picker accepts; starts must be at least this far ahead. */
export const BOOKING_STARTS_MINUTES_AHEAD = 5;

/**
 * Timezone fixed for scheduling. West Africa Time is UTC+1 year-round (no
 * DST), so the offset is a constant rather than a system lookup.
 */
export const BOOKING_TIMEZONE = "Africa/Lagos";
export const BOOKING_OFFSET_MINUTES = 60;

const LOCAL_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Left-pad a number for the `YYYY-MM-DDTHH:MM` wall-clock format. */
function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Parse a `datetime-local` value as West Africa Time.
 *
 * A `datetime-local` picker submits local wall-clock time with no zone
 * (`YYYY-MM-DDTHH:MM`). Browsers are able to resolve such a string to a real
 * instant only through their own `Date` implementation, which is host-current
 * (the server, not the user) — `Date.parse` would therefore shift the instant
 * by however far the server clock is from UTC+1. This helper does the same
 * arithmetic the browser would perform *for the user's own local time* instead:
 * it reads the fields as UTC, adds the fixed WAT offset, and returns the
 * resulting absolute `Date`. The database stores it as `timestamptz`, so
 * `starts_at`/`ends_at` and the `no_overlapping_bookings` exclusion stay
 * comparable no matter where the server runs.
 *
 * The round-trip check is deliberate: the calendar never rolls over, so a
 * non-existent wall-clock time (e.g. 2026-02-30 or 2026-13-01) read as UTC
 * round-trips to a different string and is rejected as invalid instead of
 * silently becoming a different day. Returns `null` when the input is not a
 * valid datetime-local value at all.
 */
export function parseSchedulingLocalTime(input: string): Date | null {
  const match = LOCAL_DATETIME_PATTERN.exec(input);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const numeric = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };

  if (
    !Number.isInteger(numeric.year) ||
    numeric.month < 1 ||
    numeric.month > 12 ||
    numeric.hour > 23 ||
    numeric.minute > 59
  ) {
    return null;
  }

  // Original wall-clock re-derived from the parsed fields.
  const wallClock = `${year}-${month}-${day}T${hour}:${minute}`;

  // First validate the fields as a plain UTC datetime (the calendar cannot roll
  // over), then shift by the fixed WAT offset to get the true instant.
  const asUtc = Date.UTC(
    numeric.year,
    numeric.month - 1,
    numeric.day,
    numeric.hour,
    numeric.minute,
  );
  const utcDate = new Date(asUtc);
  const rebuilt =
    `${utcDate.getUTCFullYear()}-${pad2(utcDate.getUTCMonth() + 1)}-` +
    `${pad2(utcDate.getUTCDate())}T${pad2(utcDate.getUTCHours())}:${pad2(utcDate.getUTCMinutes())}`;

  if (rebuilt !== wallClock) return null;

  return new Date(asUtc - BOOKING_OFFSET_MINUTES * 60_000);
}

/**
 * A booking window (start + end) chosen in a local `datetime-local` picker.
 *
 * `datetime-local` submits the user's wall-clock time without a zone. The
 * window is interpreted as West Africa Time (see `parseSchedulingLocalTime`)
 * and compared as real instants, so "near future" and "end after start" mean
 * the same thing on any server clock. The checks are:
 *   * both fields present,
 *   * a parseable wall-clock datetime in WAT,
 *   * a start at least a few minutes in the future,
 *   * an end strictly after the start.
 *
 * `now` is injectable for tests; it defaults to the current clock. Successful
 * values are normalised to UTC ISO strings for storage as `timestamptz`.
 */
export function bookingWindowSchema(now: Date = new Date()) {
  return z
    .strictObject({
      startsAt: z.string().min(1, "Choose a start date and time."),
      endsAt: z.string().min(1, "Choose an end date and time."),
    })
    .superRefine((value, ctx) => {
      const start = parseSchedulingLocalTime(value.startsAt);
      const end = parseSchedulingLocalTime(value.endsAt);

      if (!start) {
        ctx.addIssue({
          code: "custom",
          path: ["startsAt"],
          message: "Enter a valid start time.",
        });
      } else if (
        start.getTime() <= now.getTime() + BOOKING_STARTS_MINUTES_AHEAD * 60_000
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["startsAt"],
          message: "Choose a start time in the near future.",
        });
      }

      if (!end) {
        ctx.addIssue({
          code: "custom",
          path: ["endsAt"],
          message: "Enter a valid end time.",
        });
      } else if (start && end.getTime() <= start.getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["endsAt"],
          message: "The session must end after it starts.",
        });
      }
    })
    .transform((value) => {
      const start = parseSchedulingLocalTime(value.startsAt);
      const end = parseSchedulingLocalTime(value.endsAt);
      return {
        // `superRefine` guarantees non-null on success.
        startsAt: (start as Date).toISOString(),
        endsAt: (end as Date).toISOString(),
      };
    });
}

export type BookingWindowInput = z.infer<ReturnType<typeof bookingWindowSchema>>;

/** A single `{ day, period }` entry as stored in `preferred_slots` jsonb. */
export function isRequestSlot(value: unknown): value is {
  day: WeekDay;
  period: DayPeriod;
} {
  if (typeof value !== "object" || value === null) return false;
  const slot = value as Record<string, unknown>;
  return (
    typeof slot.day === "string" &&
    typeof slot.period === "string" &&
    (WEEK_DAYS as readonly string[]).includes(slot.day) &&
    (DAY_PERIODS as readonly string[]).includes(slot.period)
  );
}