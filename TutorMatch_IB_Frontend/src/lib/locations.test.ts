import { describe, expect, it } from "vitest";

import {
  IBADAN_LOCATIONS,
  IBADAN_LOCATION_COUNT,
  isIbadanLocation,
  resolveIbadanLocation,
} from "@/lib/locations";

describe("IBADAN_LOCATIONS", () => {
  it("has the 26 approved locations", () => {
    expect(IBADAN_LOCATION_COUNT).toBe(26);
    expect(IBADAN_LOCATIONS.length).toBe(26);
  });

  it("lists each location once, none blank", () => {
    expect(new Set(IBADAN_LOCATIONS).size).toBe(IBADAN_LOCATIONS.length);
    for (const location of IBADAN_LOCATIONS) {
      expect(location.trim().length).toBeGreaterThan(0);
    }
  });

  it("resolves every canonical entry to itself", () => {
    for (const location of IBADAN_LOCATIONS) {
      expect(resolveIbadanLocation(location)).toBe(location);
    }
  });
});

describe("isIbadanLocation", () => {
  it("accepts canonical spellings and case-insensitive variants", () => {
    expect(isIbadanLocation("Bodija")).toBe(true);
    expect(isIbadanLocation("bodija")).toBe(true);
    expect(isIbadanLocation("  DUGBE  ")).toBe(true);
    expect(isIbadanLocation("University of Ibadan")).toBe(true);
  });

  it("rejects out-of-list and non-string values", () => {
    expect(isIbadanLocation("Porthacourt")).toBe(false);
    expect(isIbadanLocation("Lekki, Lagos")).toBe(false);
    expect(isIbadanLocation("")).toBe(false);
    expect(isIbadanLocation(7)).toBe(false);
    expect(isIbadanLocation(null)).toBe(false);
  });
});

describe("resolveIbadanLocation", () => {
  it("normalises case and surrounding whitespace", () => {
    expect(resolveIbadanLocation("bodija")).toBe("Bodija");
    expect(resolveIbadanLocation("  DUGBE  ")).toBe("Dugbe");
    expect(resolveIbadanLocation("university of ibadan")).toBe(
      "University of Ibadan",
    );
  });

  it("is idempotent", () => {
    expect(resolveIbadanLocation("Bodija")).toBe("Bodija");
  });

  it("returns null for unknown, empty or non-string values", () => {
    expect(resolveIbadanLocation("Porthacourt")).toBeNull();
    expect(resolveIbadanLocation("Lekki, Lagos")).toBeNull();
    expect(resolveIbadanLocation("")).toBeNull();
    expect(resolveIbadanLocation("   ")).toBeNull();
    expect(resolveIbadanLocation(undefined)).toBeNull();
  });
});