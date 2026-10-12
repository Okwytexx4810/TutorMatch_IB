import { afterEach, describe, expect, it } from "vitest";

import { configuredAdminEmails, isConfiguredAdminEmail } from "./admin";

const original = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (original === undefined) {
    delete process.env.ADMIN_EMAILS;
  } else {
    process.env.ADMIN_EMAILS = original;
  }
});

describe("configuredAdminEmails", () => {
  it("splits, trims and lower-cases a comma-separated list", () => {
    process.env.ADMIN_EMAILS = " Admin@Example.com , ops@example.org ";
    expect(configuredAdminEmails()).toEqual(
      new Set(["admin@example.com", "ops@example.org"]),
    );
  });

  it("drops empty entries", () => {
    process.env.ADMIN_EMAILS = "a@b.com,,   ,c@d.com";
    expect(configuredAdminEmails()).toEqual(
      new Set(["a@b.com", "c@d.com"]),
    );
  });

  it("returns an empty set when unset or blank", () => {
    delete process.env.ADMIN_EMAILS;
    expect(configuredAdminEmails().size).toBe(0);
    process.env.ADMIN_EMAILS = "   ";
    expect(configuredAdminEmails().size).toBe(0);
  });
});

describe("isConfiguredAdminEmail", () => {
  it("matches case-insensitively and trims the candidate", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    expect(isConfiguredAdminEmail("  ADMIN@example.com ")).toBe(true);
  });

  it("is false for null, undefined and unknown addresses", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    expect(isConfiguredAdminEmail(null)).toBe(false);
    expect(isConfiguredAdminEmail(undefined)).toBe(false);
    expect(isConfiguredAdminEmail("someone@else.com")).toBe(false);
  });

  it("is false for every address when the list is empty", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isConfiguredAdminEmail("admin@example.com")).toBe(false);
  });
});
