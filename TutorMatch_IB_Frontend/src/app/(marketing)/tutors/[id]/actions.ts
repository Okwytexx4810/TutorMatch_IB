"use server";

import { revalidatePath } from "next/cache";

import {
  authFailure,
  authSuccess,
  type AuthFormState,
} from "@/lib/auth/action-state";
import { getUser } from "@/lib/auth/session";
import { createTutorRequest } from "@/lib/supabase/mutations/requests";
import { ROUTES } from "@/lib/site-config";
import { field, fieldErrorsFrom } from "@/lib/utils/form";
import { tutorRequestSchema } from "@/lib/validation/engagement";

/**
 * Send a tuition request from a tutor's public profile.
 *
 * Public page, private action: `getUser()` gates the write, the schema
 * validates the allowlisted fields, and `createTutorRequest` derives the
 * requester from the session and re-reads the tutor's real offerings before
 * inserting. The database's insert policy and partial unique index are the
 * final word on who may write and whether a pending request already exists.
 */
export async function sendTutorRequestAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getUser();
  if (!user) return authFailure("Please sign in to send a request.");

  const parsed = tutorRequestSchema.safeParse({
    tutorId: field(formData, "tutorId"),
    subject: field(formData, "subject"),
    level: field(formData, "level"),
    location: field(formData, "location"),
    day: field(formData, "day"),
    period: field(formData, "period"),
    message: field(formData, "message"),
    budget: field(formData, "budget"),
  });

  if (!parsed.success) {
    return authFailure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const result = await createTutorRequest(parsed.data);

  if (!result.ok) {
    return authFailure(result.message);
  }

  // The tutor detail page shows the requester's own pending state; the requests
  // page is where the request now lives.
  revalidatePath(ROUTES.tutorProfile(parsed.data.tutorId));
  revalidatePath(ROUTES.dashboardRequests);
  revalidatePath(ROUTES.tutorRequests);
  revalidatePath(ROUTES.tutorDashboard);

  return authSuccess(
    "Your request was sent. You can track it from your requests page.",
  );
}