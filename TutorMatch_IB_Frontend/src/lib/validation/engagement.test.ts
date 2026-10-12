import { describe, expect, it } from "vitest";

import {
  BOOKING_ACTOR_TRANSITIONS,
  BOOKING_OFFSET_MINUTES,
  BOOKING_STARTS_MINUTES_AHEAD,
  bookingTransitionFailure,
  bookingWindowSchema,
  canTransitionBooking,
  canTransitionRequest,
  isRequestSlot,
  parseSchedulingLocalTime,
  REQUEST_BUDGET_MAX,
  REQUEST_MESSAGE_MAX,
  requestTransitionFailure,
  tutorRequestSchema,
} from "@/lib/validation/engagement";

const VALID_TUTOR_ID = "071327fd-a964-41b6-be18-2a96d2cd0d77";

const validRequest = {
  tutorId: VALID_TUTOR_ID,
  subject: "Economics",
  level: "waec",
  location: "Bodija",
  day: "monday",
  period: "evening",
  message: "Need help before my mock exams.",
  budget: "9000",
} as const;

describe("tutorRequestSchema", () => {
  it("accepts a valid request and canonicalises its location", () => {
    const parsed = tutorRequestSchema.safeParse({
      ...validRequest,
      location: "  bodija  ",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.location).toBe("Bodija");
    expect(parsed.data.budget).toBe(9000);
    expect(parsed.data.level).toBe("waec");
  });

  it("turns blank optional message and budget into null", () => {
    const parsed = tutorRequestSchema.safeParse({
      ...validRequest,
      message: "   ",
      budget: "",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.message).toBeNull();
    expect(parsed.data.budget).toBeNull();
  });

  it("rejects an unapproved location and an unknown education level", () => {
    expect(
      tutorRequestSchema.safeParse({ ...validRequest, location: "Porthacourt" })
        .success,
    ).toBe(false);
    expect(
      tutorRequestSchema.safeParse({ ...validRequest, level: "phd" }).success,
    ).toBe(false);
  });

  it("rejects a non-uuid tutor id", () => {
    expect(
      tutorRequestSchema.safeParse({ ...validRequest, tutorId: "123" }).success,
    ).toBe(false);
  });

  it("rejects an empty subject and one over the published limit", () => {
    expect(
      tutorRequestSchema.safeParse({ ...validRequest, subject: "   " }).success,
    ).toBe(false);
    expect(
      tutorRequestSchema.safeParse({
        ...validRequest,
        subject: "x".repeat(121),
      }).success,
    ).toBe(false);
  });

  it("rejects a message over the published limit", () => {
    expect(
      tutorRequestSchema.safeParse({
        ...validRequest,
        message: "x".repeat(REQUEST_MESSAGE_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects negative, fractional and above-cap budgets", () => {
    for (const budget of ["-1", "9000.5", "abc", String(REQUEST_BUDGET_MAX + 1)]) {
      expect(
        tutorRequestSchema.safeParse({ ...validRequest, budget }).success,
      ).toBe(false);
    }
  });

  it("rejects an invalid day or period", () => {
    expect(
      tutorRequestSchema.safeParse({ ...validRequest, day: "funday" }).success,
    ).toBe(false);
    expect(
      tutorRequestSchema.safeParse({ ...validRequest, period: "noon" }).success,
    ).toBe(false);
  });

  it("rejects unknown keys via strict mode", () => {
    expect(
      tutorRequestSchema.safeParse({ ...validRequest, status: "accepted" })
        .success,
    ).toBe(false);
  });
});

describe("preferred-slot shape", () => {
  it("accepts only known day/period pairs", () => {
    expect(isRequestSlot({ day: "monday", period: "morning" })).toBe(true);
    expect(isRequestSlot({ day: "funday", period: "morning" })).toBe(false);
    expect(isRequestSlot({ day: "monday", period: "noon" })).toBe(false);
    expect(isRequestSlot({ day: "monday" })).toBe(false);
    expect(isRequestSlot(null)).toBe(false);
    expect(isRequestSlot("monday")).toBe(false);
  });
});

describe("request transitions", () => {
  it("allows a requester to cancel their own pending request only", () => {
    expect(canTransitionRequest("pending", "cancelled", "requester")).toBe(true);
    expect(canTransitionRequest("pending", "accepted", "requester")).toBe(false);
    expect(canTransitionRequest("accepted", "cancelled", "requester")).toBe(
      false,
    );
  });

  it("allows a tutor to accept or decline a pending request only", () => {
    expect(canTransitionRequest("pending", "accepted", "tutor")).toBe(true);
    expect(canTransitionRequest("pending", "declined", "tutor")).toBe(true);
    expect(canTransitionRequest("accepted", "declined", "tutor")).toBe(false);
    expect(canTransitionRequest("pending", "cancelled", "tutor")).toBe(false);
  });

  it("returns a safe hint instead of a status for an illegal change", () => {
    expect(requestTransitionFailure("pending", "cancelled", "requester")).toBeNull();
    expect(requestTransitionFailure("declined", "accepted", "tutor")).toBe(
      "Only a pending request can be accepted or declined.",
    );
  });

  it("lets an administrator triage any application, pending or accepted", () => {
    expect(canTransitionRequest("pending", "accepted", "admin")).toBe(true);
    expect(canTransitionRequest("pending", "declined", "admin")).toBe(true);
    expect(canTransitionRequest("pending", "cancelled", "admin")).toBe(true);
    expect(canTransitionRequest("accepted", "cancelled", "admin")).toBe(true);
    expect(canTransitionRequest("accepted", "declined", "admin")).toBe(false);
    expect(canTransitionRequest("declined", "accepted", "admin")).toBe(false);
    expect(canTransitionRequest("cancelled", "accepted", "admin")).toBe(false);
  });
});

describe("booking transitions", () => {
  it("lets either party cancel, but only the tutor complete", () => {
    expect(canTransitionBooking("confirmed", "cancelled", "requester")).toBe(
      true,
    );
    expect(canTransitionBooking("confirmed", "completed", "requester")).toBe(
      false,
    );
    expect(canTransitionBooking("confirmed", "completed", "tutor")).toBe(true);
    expect(canTransitionBooking("completed", "cancelled", "tutor")).toBe(false);
  });

  it("treats completed, cancelled and no_show as terminal", () => {
    for (const status of ["completed", "cancelled", "no_show"] as const) {
      expect(BOOKING_ACTOR_TRANSITIONS.tutor[status]).toEqual([]);
      expect(BOOKING_ACTOR_TRANSITIONS.requester[status]).toEqual([]);
      expect(BOOKING_ACTOR_TRANSITIONS.admin[status]).toEqual([]);
    }
  });

  it("lets an administrator manage any confirmed booking", () => {
    expect(canTransitionBooking("confirmed", "completed", "admin")).toBe(true);
    expect(canTransitionBooking("confirmed", "cancelled", "admin")).toBe(true);
    expect(canTransitionBooking("confirmed", "no_show", "admin")).toBe(true);
    expect(canTransitionBooking("completed", "cancelled", "admin")).toBe(false);
    expect(canTransitionBooking("cancelled", "confirmed", "admin")).toBe(false);
    expect(canTransitionBooking("no_show", "completed", "admin")).toBe(false);
  });

  it("returns a safe hint for an illegal booking change", () => {
    expect(bookingTransitionFailure("confirmed", "cancelled", "tutor")).toBeNull();
    expect(bookingTransitionFailure("completed", "cancelled", "tutor")).toBe(
      "Only a confirmed booking can be cancelled or completed.",
    );
    expect(bookingTransitionFailure("no_show", "completed", "admin")).toBe(
      "Only a confirmed booking can be managed.",
    );
  });
});

/** Render an instant as the WAT wall-clock string a `datetime-local` submits. */
function toWatInput(date: Date): string {
  const wat = new Date(date.getTime() + BOOKING_OFFSET_MINUTES * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${wat.getUTCFullYear()}-${pad(wat.getUTCMonth() + 1)}-${pad(
    wat.getUTCDate(),
  )}T${pad(wat.getUTCHours())}:${pad(wat.getUTCMinutes())}`;
}

describe("parseSchedulingLocalTime", () => {
  it("interprets wall-clock input as WAT (UTC+1), never the server zone", () => {
    expect(parseSchedulingLocalTime("2026-01-01T10:00")?.toISOString()).toBe(
      "2026-01-01T09:00:00.000Z",
    );
    expect(parseSchedulingLocalTime("2026-01-01T00:30")?.toISOString()).toBe(
      "2025-12-31T23:30:00.000Z",
    );
  });

  it("returns null for unparseable or rolled-over datetimes", () => {
    for (const input of [
      "",
      "not-a-date",
      "2026-01-01 10:00",
      "2026-01-01T25:00",
      "2026-01-01T10:60",
      "2026-02-30T10:00",
      "2026-13-01T10:00",
    ]) {
      expect(parseSchedulingLocalTime(input)).toBeNull();
    }
  });

  it("round-trips an instant with precision down to the minute", () => {
    const instant = new Date("2026-06-01T12:00:00.000Z");
    const input = toWatInput(instant);
    expect(parseSchedulingLocalTime(input)?.getTime()).toBe(instant.getTime());
  });
});

describe("bookingWindowSchema", () => {
  // Fixed instant so "future", "past" and "lead time" are deterministic on any
  // host. All inputs are WAT wall-clock, so the comparison never depends on the
  // server's own timezone.
  const now = new Date("2026-06-01T08:00:00.000Z");

  const startsAt = new Date(now.getTime() + 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  it("accepts a future window and normalises both ends to ISO", () => {
    const parsed = bookingWindowSchema(now).safeParse({
      startsAt: toWatInput(startsAt),
      endsAt: toWatInput(endsAt),
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(Date.parse(parsed.data.endsAt)).toBeGreaterThan(
      Date.parse(parsed.data.startsAt),
    );
    expect(parsed.data.startsAt.endsWith("Z")).toBe(true);
  });

  it("rejects a start in the past or inside the lead time", () => {
    const tooSoon = new Date(
      now.getTime() + BOOKING_STARTS_MINUTES_AHEAD * 60_000,
    );
    const past = new Date(now.getTime() - 60 * 60 * 1000);

    expect(
      bookingWindowSchema(now).safeParse({
        startsAt: toWatInput(past),
        endsAt: toWatInput(startsAt),
      }).success,
    ).toBe(false);

    expect(
      bookingWindowSchema(now).safeParse({
        startsAt: toWatInput(tooSoon),
        endsAt: toWatInput(endsAt),
      }).success,
    ).toBe(false);
  });

  it("rejects an end that is not after the start", () => {
    expect(
      bookingWindowSchema(now).safeParse({
        startsAt: toWatInput(startsAt),
        endsAt: toWatInput(startsAt),
      }).success,
    ).toBe(false);
  });

  it("rejects empty, unparseable and rolled-over datetimes", () => {
    expect(
      bookingWindowSchema(now).safeParse({ startsAt: "", endsAt: "" }).success,
    ).toBe(false);
    expect(
      bookingWindowSchema(now).safeParse({
        startsAt: "not-a-date",
        endsAt: toWatInput(endsAt),
      }).success,
    ).toBe(false);
    expect(
      bookingWindowSchema(now).safeParse({
        startsAt: "2026-02-30T10:00",
        endsAt: toWatInput(endsAt),
      }).success,
    ).toBe(false);
  });
});