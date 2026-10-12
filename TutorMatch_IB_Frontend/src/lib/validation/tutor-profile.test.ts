import { describe, expect, it } from "vitest";

import {
  deriveProfileCompleteness,
  tutorProfileLimits,
  tutorProfileSchema,
  type TutorProfileInput,
} from "@/lib/validation/tutor-profile";

const validInput: TutorProfileInput = {
  displayName: "Mr. Adeyemi",
  headline: "Economics tutor for WAEC and NECO",
  bio: "Eight years helping students across Ibadan.",
  location: "Bodija",
  hourlyRate: 6000,
  yearsOfExperience: 8,
  subjects: ["Economics", "Mathematics"],
  levels: ["waec", "sss"],
};

describe("tutorProfileSchema", () => {
  it("accepts a valid payload and resolves the location to canonical spelling", () => {
    const parsed = tutorProfileSchema.safeParse({
      ...validInput,
      location: "  bodija  ",
      displayName: "  Mr. Adeyemi  ",
      hourlyRate: "6000",
      yearsOfExperience: "8",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.location).toBe("Bodija");
    expect(parsed.data.displayName).toBe("Mr. Adeyemi");
    expect(parsed.data.hourlyRate).toBe(6000);
  });

  it("rejects a location outside the 26 approved areas", () => {
    const parsed = tutorProfileSchema.safeParse({
      ...validInput,
      location: "Porthacourt",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toBe(
      "Select one of the approved Ibadan locations.",
    );
  });

  it("rejects unknown keys via strict mode", () => {
    const parsed = tutorProfileSchema.safeParse({
      ...validInput,
      is_verified: true,
    });
    expect(parsed.success).toBe(false);
  });

  it("turns blank optional text into null rather than an empty string", () => {
    const parsed = tutorProfileSchema.safeParse({
      ...validInput,
      displayName: "   ",
      headline: "",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.displayName).toBeNull();
    expect(parsed.data.headline).toBeNull();
  });

  it("caps the display name at the published limit", () => {
    const parsed = tutorProfileSchema.safeParse({
      ...validInput,
      displayName: "x".repeat(tutorProfileLimits.displayName + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-integer, zero and negative rates", () => {
    for (const hourlyRate of ["6000.5", "0", "-1", "abc"]) {
      expect(
        tutorProfileSchema.safeParse({ ...validInput, hourlyRate }).success,
      ).toBe(false);
    }
  });

  it("requires at least one subject and one level", () => {
    expect(
      tutorProfileSchema.safeParse({ ...validInput, subjects: [] }).success,
    ).toBe(false);
    expect(
      tutorProfileSchema.safeParse({ ...validInput, levels: [] }).success,
    ).toBe(false);
  });

  it("de-duplicates subjects and levels", () => {
    const parsed = tutorProfileSchema.safeParse({
      ...validInput,
      subjects: ["Economics", "Economics", "Mathematics"],
      levels: ["sss", "sss", "waec"],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.subjects).toEqual(["Economics", "Mathematics"]);
    expect(parsed.data.levels).toEqual(["sss", "waec"]);
  });
});

describe("deriveProfileCompleteness", () => {
  it("starts at the required-field floor", () => {
    expect(
      deriveProfileCompleteness({ ...validInput, headline: null, bio: null }),
    ).toBe(50);
  });

  it("reaches 100 when the optional fields are filled", () => {
    expect(deriveProfileCompleteness(validInput)).toBe(100);
  });
});