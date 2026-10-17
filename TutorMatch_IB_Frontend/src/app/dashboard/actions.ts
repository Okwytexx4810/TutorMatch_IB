"use server";

import { revalidatePath } from "next/cache";

import {
  authFailure,
  authSuccess,
  type AuthFormState,
} from "@/lib/auth/action-state";
import { getUser } from "@/lib/auth/session";
import {
  changeBookingStatus,
  scheduleBookingFromRequest,
} from "@/lib/supabase/mutations/bookings";
import { cancelRequesterRequest } from "@/lib/supabase/mutations/requests";
import { ROUTES } from "@/lib/site-config";
import { field, fieldErrorsFrom } from "@/lib/utils/form";
import { bookingWindowSchema } from "@/lib/validation/engagement";

/**
 * Student/parent engagement Server Actions for `/dashboard/requests` and
 * `/dashboard/bookings`.
 *
 * Every action re-derives the actor from the session and re-checks the row
 * through the mutation and RLS, so the ids in the `FormData` are references the
 * client legitimately chooses, never authority. Failures return text written
 * here, never a database error object.
 */

/** Withdraw a pending request. */
export async function cancelRequesterRequestAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getUser();
  if (!user) {
    return authFailure("Your session has expired. Please sign in again.");
  }

  const requestId = field(formData, "requestId");
  if (!requestId) return authFailure("We could not identify that request.");

  const result = await cancelRequesterRequest(requestId);
  if (!result.ok) return authFailure(result.message);

  revalidatePath(ROUTES.dashboardRequests);
  revalidatePath(ROUTES.tutorRequests);
  revalidatePath(ROUTES.tutorDashboard);
  return authSuccess("Your request was cancelled.");
}

/** Schedule a session for an accepted request. */
export async function scheduleRequesterBookingAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getUser();
  if (!user) {
    return authFailure("Your session has expired. Please sign in again.");
  }

  const requestId = field(formData, "requestId");
  if (!requestId) return authFailure("We could not identify that request.");

  const parsedWindow = bookingWindowSchema().safeParse({
    startsAt: field(formData, "startsAt"),
    endsAt: field(formData, "endsAt"),
  });

  if (!parsedWindow.success) {
    return authFailure(
      "Check the session start and end times.",
      fieldErrorsFrom(parsedWindow.error),
    );
  }

  const result = await scheduleBookingFromRequest(
    requestId,
    parsedWindow.data.startsAt,
    parsedWindow.data.endsAt,
  );

  if (!result.ok) return authFailure(result.message);

  revalidatePath(ROUTES.dashboardBookings);
  revalidatePath(ROUTES.dashboardRequests);
  return authSuccess("Your session is booked. See it under your sessions.");
}

/** Cancel a confirmed booking. */
export async function cancelRequesterBookingAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getUser();
  if (!user) {
    return authFailure("Your session has expired. Please sign in again.");
  }

  const bookingId = field(formData, "bookingId");
  if (!bookingId) return authFailure("We could not identify that booking.");

  const result = await changeBookingStatus(bookingId, "cancelled", "requester");
  if (!result.ok) return authFailure(result.message);

  revalidatePath(ROUTES.dashboardBookings);
  return authSuccess("That session was cancelled.");
}