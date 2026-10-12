import { describe, expect, it } from "vitest";

import {
  buildDiscoveryHref,
  discoveryHasFilters,
  DISCOVERY_MAX_RATE,
  EMPTY_TUTOR_DISCOVERY_FILTERS,
  parseTutorDiscoverySearchParams,
  TUTORS_PER_PAGE,
  type TutorDiscoveryFilters,
} from "@/lib/validation/tutor-discovery";

const raw = (overrides: Record<string, string> = {}) => ({
  subject: "Physics",
  level: "sss",
  location: "Bodija",
  minRate: "1000",
  maxRate: "8000",
  day: "saturday",
  period: "morning",
  page: "3",
  ...overrides,
});

describe("parseTutorDiscoverySearchParams", () => {
  it("parses a full filter set and page", () => {
    const { filters, page } = parseTutorDiscoverySearchParams(raw());
    expect(filters.subject).toBe("Physics");
    expect(filters.level).toBe("sss");
    expect(filters.location).toBe("Bodija");
    expect(filters.minRate).toBe(1000);
    expect(filters.maxRate).toBe(8000);
    expect(filters.day).toBe("saturday");
    expect(filters.period).toBe("morning");
    expect(page).toBe(3);
  });

  it("trims the subject and resolves the location case-insensitively", () => {
    const { filters } = parseTutorDiscoverySearchParams({
      subject: "  mathematics ",
      location: "dugbe",
    });
    expect(filters.subject).toBe("mathematics");
    expect(filters.location).toBe("Dugbe");
  });

  it("drops invalid enum values per field", () => {
    const { filters } = parseTutorDiscoverySearchParams({
      level: "university",
      day: "tuesday01",
      period: "night",
    });
    expect(filters.level).toBeNull();
    expect(filters.day).toBeNull();
    expect(filters.period).toBeNull();
  });

  it("ignores unknown and empty subjects", () => {
    const { filters } = parseTutorDiscoverySearchParams({ subject: "   " });
    expect(filters.subject).toBeNull();
  });

  it("rejects unrecognised locations", () => {
    const { filters } = parseTutorDiscoverySearchParams({
      location: "Porthacourt",
    });
    expect(filters.location).toBeNull();
  });

  it("clamps out-of-range rates to null", () => {
    expect(
      parseTutorDiscoverySearchParams({ minRate: "-5" }).filters.minRate,
    ).toBeNull();
    expect(
      parseTutorDiscoverySearchParams({
        maxRate: String(DISCOVERY_MAX_RATE + 1),
      }).filters.maxRate,
    ).toBeNull();
    expect(
      parseTutorDiscoverySearchParams({ minRate: "abc" }).filters.minRate,
    ).toBeNull();
  });

  it("nulls both rates when min exceeds max", () => {
    const { filters } = parseTutorDiscoverySearchParams({
      minRate: "9000",
      maxRate: "1000",
    });
    expect(filters.minRate).toBeNull();
    expect(filters.maxRate).toBeNull();
  });

  it("does not break a no-filter call", () => {
    const search = parseTutorDiscoverySearchParams({});
    expect(search.filters).toEqual(EMPTY_TUTOR_DISCOVERY_FILTERS);
    expect(search.page).toBe(1);
  });

  it("clamps non-numeric pages to 1", () => {
    expect(parseTutorDiscoverySearchParams({ page: "abc" }).page).toBe(1);
    expect(parseTutorDiscoverySearchParams({ page: "0" }).page).toBe(1);
  });
});

describe("discoveryHasFilters", () => {
  it("distinguishes an empty set from a filtered one", () => {
    expect(discoveryHasFilters(EMPTY_TUTOR_DISCOVERY_FILTERS)).toBe(false);

    const subjectOnly: TutorDiscoveryFilters = {
      ...EMPTY_TUTOR_DISCOVERY_FILTERS,
      subject: "Physics",
    };
    expect(discoveryHasFilters(subjectOnly)).toBe(true);
  });
});

describe("buildDiscoveryHref", () => {
  const href = (page: number) =>
    buildDiscoveryHref(
      {
        subject: "Physics",
        level: "sss",
        location: "Bodija",
        minRate: 1000,
        maxRate: 8000,
        day: "saturday",
        period: "morning",
      },
      page,
    );

  it("encodes every active filter and the page", () => {
    const query = href(3);
    for (const pair of [
      "subject=Physics",
      "level=sss",
      "location=Bodija",
      "minRate=1000",
      "maxRate=8000",
      "day=saturday",
      "period=morning",
      "page=3",
    ]) {
      expect(query).toContain(pair);
    }
  });

  it("omits the page on page 1 and null filters entirely", () => {
    const query = buildDiscoveryHref(EMPTY_TUTOR_DISCOVERY_FILTERS, 1);
    expect(query).toBe("");
  });

  it("round-trips with the parser", () => {
    const search = parseTutorDiscoverySearchParams(
      Object.fromEntries(
        href(2)
          .replace("?", "")
          .split("&")
          .map((pair) => pair.split("=") as [string, string]),
      ),
    );
    expect(search.filters.subject).toBe("Physics");
    expect(search.filters.level).toBe("sss");
    expect(search.filters.location).toBe("Bodija");
    expect(search.filters.minRate).toBe(1000);
    expect(search.filters.maxRate).toBe(8000);
    expect(search.filters.day).toBe("saturday");
    expect(search.filters.period).toBe("morning");
    expect(search.page).toBe(2);
  });
});

describe("pagination constants", () => {
  it("exposes the page size discovery and the UI agree on", () => {
    expect(TUTORS_PER_PAGE).toBe(9);
  });
});