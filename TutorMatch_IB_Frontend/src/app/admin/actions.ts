"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  authFailure,
  authSuccess,
  type AuthFormState,
} from "@/lib/auth/action-state";
import { requireRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import {
  manageBookingAsAdmin,
  manageRequestAsAdmin,
  setTutorVerified,
} from "@/lib/supabase/mutations/admin";
import type { BookingStatus, RequestStatus } from "@/types/engagement";

/**
 * Administrator Server Actions.
 *
 * Follows the tutor action pattern: authorise first, parse before touching
 * Supabase, derive identity from the session, and return text written here
 * rather than a database error. `requireRole(["admin"])` is repeated inside each
 * action rather than assumed from the layout, because these are the functions
 * that write.
 */

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

const uuidSchema = z.string().uuid();

/** The status each manage-intent maps to, or `undefined` for an unknown intent. */
const STATUS_BY_INTENT: Record<string, RequestStatus | undefined> = {
  accept: "accepted",
  decline: "declined",
  cancel: "cancelled",
};

/** The booking status each management intent maps to. */
const BOOKING_STATUS_BY_INTENT: Record<string, BookingStatus | undefined> = {
  complete: "completed",
  cancel: "cancelled",
  no_show: "no_show",
};

/**
 * Accept, decline or cancel any application. The clicked button sets `intent`,
 * which the action maps to a status; the transition guard lives in the mutation.
 */
export async function manageRequestAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  await requireRole(["admin"], ROUTES.adminRequests);

  const status = STATUS_BY_INTENT[field(formData, "intent")];
  if (!status) return authFailure("We could not tell what you wanted to do.");

  const parsedId = uuidSchema.safeParse(field(formData, "requestId"));
  if (!parsedId.success) {
    return authFailure("We could not identify that application.");
  }

  const result = await manageRequestAsAdmin(parsedId.data, status);
  if (!result.ok) return authFailure(result.message);

  revalidatePath(ROUTES.adminRequests);
  revalidatePath(ROUTES.admin);

  if (status === "accepted") return authSuccess("Application accepted.");
  if (status === "declined") return authSuccess("Application declined.");
  return authSuccess("Application closed.");
}

/** Verify or unverify a tutor profile. */
export async function setTutorVerifiedAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  await requireRole(["admin"], ROUTES.adminTutors);

  const intent = field(formData, "intent");
  if (intent !== "verify" && intent !== "unverify") {
    return authFailure("We could not tell what you wanted to do.");
  }

  const parsedId = uuidSchema.safeParse(field(formData, "tutorId"));
  if (!parsedId.success) {
    return authFailure("We could not identify that tutor.");
  }

  const result = await setTutorVerified(parsedId.data, intent === "verify");
  if (!result.ok) return authFailure(result.message);

  revalidatePath(ROUTES.adminTutors);
  revalidatePath(ROUTES.admin);

  return intent === "verify"
    ? authSuccess("Tutor verified.")
    : authSuccess("Tutor verification removed.");
}

/**
 * Manage any booking on the platform. The tutor creates and completes their own
 * sessions; the administrator's role is oversight: mark a session complete,
 * cancel it, or record a no-show. The clicked button sets `intent`, which maps
 * to a status; the transition guard lives in the mutation.
 */
export async function manageBookingAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  await requireRole(["admin"], ROUTES.adminBookings);

  const status = BOOKING_STATUS_BY_INTENT[field(formData, "intent")];
  if (!status) return authFailure("We could not tell what you wanted to do.");

  const parsedId = uuidSchema.safeParse(field(formData, "bookingId"));
  if (!parsedId.success) {
    return authFailure("We could not identify that booking.");
  }

  const result = await manageBookingAsAdmin(parsedId.data, status);
  if (!result.ok) return authFailure(result.message);

  revalidatePath(ROUTES.adminBookings);
  revalidatePath(ROUTES.admin);

  if (status === "completed") return authSuccess("Session marked as completed.");
  if (status === "cancelled") return authSuccess("Session cancelled.");
  return authSuccess("Session recorded as a no-show.");
}
