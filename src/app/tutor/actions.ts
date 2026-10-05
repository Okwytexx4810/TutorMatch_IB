"use server";

import { revalidatePath } from "next/cache";

import {
  authFailure,
  authSuccess,
  type AuthFormState,
} from "@/lib/auth/action-state";
import { requireRole } from "@/lib/auth/session";
import { saveCurrentTutorProfile } from "@/lib/supabase/mutations/tutor-profile";
import { ROUTES } from "@/lib/site-config";
import { tutorProfileSchema } from "@/lib/validation/tutor-profile";

/**
 * Tutor Server Actions.
 *
 * Follows the `(auth)/actions.ts` pattern: parse with Zod before touching
 * Supabase, derive identity from the session rather than the payload, and return
 * text written here rather than a database error object.
 *
 * `AuthFormState` is reused rather than duplicated. It is named for auth because
 * that is where it was introduced, but its shape — a status, a safe summary and
 * per-field messages — is exactly what a form needs, and `AuthFormAlert`
 * already renders it. A parallel type would have been a second way to say the
 * same thing.
 */

/**
 * Read one allowlisted field out of the submitted `FormData`.
 *
 * The return type is `string` whatever the body sent, so a repeated or file
 * input for one of these names cannot produce a non-string that the schema
 * would have to reason about. Anything absent reads as `""`, which then fails or
 * coerces on its merits rather than throwing.
 */
function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Map Zod issues onto per-field messages.
 *
 * A local helper rather than a shared one: `(auth)/actions.ts` has an identical
 * function, but lifting it would mean editing Phase 4 auth code, and this
 * milestone is not a refactor of the auth module.
 *
 * An issue with no `path[0]` is a schema-level one rather than a field one, and
 * is reported against the form as a whole under the `form` key.
 */
function fieldErrorsFrom(error: {
  issues: readonly { path: PropertyKey[]; message: string }[];
}): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}

/**
 * Create or update the signed-in tutor's profile.
 *
 * The submission is trusted in four independent steps, in this order:
 *
 * 1. **Allowlist.** Only the five names read below are ever pulled out of the
 *    submitted `FormData`. A crafted body carrying `is_verified`, `profile_id`,
 *    `id`, `created_at` or `updated_at` has those keys simply ignored, because
 *    nothing reads them. This, not the Zod `strict` mode, is what makes an
 *    injected field harmless.
 * 2. **Validate.** Zod validates the five allowlisted fields for shape, types,
 *    and ranges. `z.strictObject` is a second net that rejects an unrecognised
 *    key in whatever object it is given, but step 1 means it will not see one
 *    here.
 * 3. **Derive.** The mutation rebuilds the writable row server-side: `profile_id`
 *    comes from the session, and `profile_completeness` is computed from the
 *    validated input. Neither is ever accepted from the client.
 * 4. **Enforce in the database.** The Phase 4 column grants forbid writing
 *    `is_verified`, and the `tutor_profiles_insert_own` / `tutor_profiles_update_own`
 *    policies re-check ownership independently of this code. RLS is the actual
 *    security boundary; steps 1 to 3 are what keep the failure mode clean.
 *
 * Authorization runs before any of it. `requireRole` resolves the session and the
 * trusted `profiles.role`: an unauthenticated visitor is redirected to `/login`,
 * a signed-in non-tutor to their own area, and neither reaches the database. That
 * check is repeated inside the mutation rather than assumed, because a layout
 * guard can be narrowed or bypassed by a future matcher change and this is the
 * function that writes to the database.
 */
export async function saveTutorProfileAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  await requireRole(["tutor"], ROUTES.tutorProfileSettings);

  const parsed = tutorProfileSchema.safeParse({
    headline: field(formData, "headline"),
    bio: field(formData, "bio"),
    location: field(formData, "location"),
    hourlyRate: field(formData, "hourlyRate"),
    yearsOfExperience: field(formData, "yearsOfExperience"),
  });

  if (!parsed.success) {
    return authFailure(
      "Check the highlighted fields.",
      fieldErrorsFrom(parsed.error),
    );
  }

  const result = await saveCurrentTutorProfile(parsed.data);

  if (!result.ok) {
    return authFailure(result.message);
  }

  // Re-renders the page so the freshly stored values are what the form shows.
  revalidatePath(ROUTES.tutorProfileSettings);

  return authSuccess("Your tutor profile is saved.");
}
