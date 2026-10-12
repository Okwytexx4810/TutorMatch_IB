import type { AuthFormState } from "@/lib/auth/action-state";

/**
 * Server Action form helpers shared by the engagement actions.
 *
 * These are new, shared versions created for the workflow stage, deliberately
 * separate from the identical helpers duplicated in `(auth)/actions.ts` and
 * `tutor/actions.ts`: lifting those would mean editing thawed auth/tutor code,
 * which is not part of this milestone.
 */

/**
 * Read one allowlisted field out of the submitted `FormData`.
 *
 * The return type is `string` whatever the body sent, so a repeated or file
 * input for one of these names cannot produce a non-string that the schema
 * would have to reason about. Anything absent reads as `""`, which then fails
 * or coerces on its merits rather than throwing.
 */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Map Zod issues onto per-field messages.
 *
 * An issue with no `path[0]` is a schema-level one rather than a field one, and
 * is reported against the form as a whole under the `form` key.
 */
export function fieldErrorsFrom(error: {
  issues: readonly { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}

/** The `AuthFormState` shape every engagement action returns. */
export type EngagementFormState = AuthFormState;