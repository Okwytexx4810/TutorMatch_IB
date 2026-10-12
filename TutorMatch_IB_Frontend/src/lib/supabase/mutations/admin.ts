import { getUser } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  bookingTransitionFailure,
  canTransitionBooking,
  canTransitionRequest,
  requestTransitionFailure,
} from "@/lib/validation/engagement";
import type { BookingStatus, RequestStatus } from "@/types/engagement";

/**
 * Write helpers for the administrator console.
 *
 * Server-only by convention, per `lib/supabase/README.md`. These functions run as
 * the signed-in caller, so the `is_admin()` clauses in the admin-console
 * migration are the real boundary: a non-administrator's statement simply
 * matches no policy and changes nothing. The calling server action additionally
 * calls `requireRole(["admin"])` before getting here.
 */

const MESSAGES = {
  signedOut: "Your session has expired. Please sign in again.",
  failed: "We could not complete that just now. Please try again.",
  requestGone: "That application is no longer available.",
  requestChanged: "That application has just changed. Refresh to see its latest state.",
  invalidTransition:
    "That action is not allowed from the application's current state.",
  tutorGone: "That tutor profile is no longer available.",
  bookingGone: "That booking is no longer available.",
  bookingChanged: "That booking has just changed. Refresh to see its latest state.",
  invalidBookingTransition:
    "That action is not allowed from the booking's current state.",
} as const;

export type AdminActionResult = { ok: true } | { ok: false; message: string };

interface RequestStateRow {
  id: string;
  status: RequestStatus;
}

/**
 * Accept, decline or cancel any application on the platform.
 *
 * The current state is read first and the transition is checked against the
 * shared admin request map, then the UPDATE targets that exact observed state
 * so two administrators racing over the same application cannot both win; the
 * loser sees `requestChanged`.
 */
export async function manageRequestAsAdmin(
  requestId: string,
  status: RequestStatus,
): Promise<AdminActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  const supabase = await getServerSupabase();

  const { data: row, error: readError } = (await supabase
    .from("tutor_requests")
    .select("id, status")
    .eq("id", requestId)
    .maybeSingle()) as {
    data: RequestStateRow | null;
    error: { message?: string } | null;
  };

  if (readError) return { ok: false, message: MESSAGES.failed };
  if (!row) return { ok: false, message: MESSAGES.requestGone };

  if (!canTransitionRequest(row.status, status, "admin")) {
    return {
      ok: false,
      message:
        requestTransitionFailure(row.status, status, "admin") ??
        MESSAGES.invalidTransition,
    };
  }

  const patch =
    status === "cancelled"
      ? { status }
      : { status, responded_at: new Date().toISOString() };

  const { data: updated, error: updateError } = await supabase
    .from("tutor_requests")
    .update(patch)
    .eq("id", requestId)
    // Optimistic guard: only the status we just read may be replaced.
    .eq("status", row.status)
    .select("id")
    .maybeSingle();

  if (updateError) return { ok: false, message: MESSAGES.failed };
  if (!updated) return { ok: false, message: MESSAGES.requestChanged };

  return { ok: true };
}

/**
 * Verify or unverify a tutor profile.
 *
 * Routed through the SECURITY DEFINER `admin_set_tutor_verified` function because
 * `is_verified` is deliberately outside the tutor's column grants and Postgres
 * grants are per-role, so it cannot be handed to admins alone through a GRANT.
 * The function re-checks `is_admin()` inside the database.
 */
export async function setTutorVerified(
  tutorId: string,
  verified: boolean,
): Promise<AdminActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  const supabase = await getServerSupabase();

  const { data, error } = await supabase.rpc("admin_set_tutor_verified", {
    p_tutor_id: tutorId,
    p_verified: verified,
  });

  if (error) return { ok: false, message: MESSAGES.failed };
  if (data !== true) return { ok: false, message: MESSAGES.tutorGone };

  return { ok: true };
}

interface BookingStateRow {
  id: string;
  status: BookingStatus;
}

/**
 * Manage any booking on the platform: mark it complete, cancel it, or record a
 * no-show. Confirmed bookings are the only rows that may be changed, mirroring
 * the parties' own rules through the shared `admin` actor map. The UPDATE goes
 * through the `bookings_admin_update` policy and targets the exact observed
 * status, so two administrators racing over the same booking cannot both win.
 */
export async function manageBookingAsAdmin(
  bookingId: string,
  status: BookingStatus,
): Promise<AdminActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  const supabase = await getServerSupabase();

  const { data: row, error: readError } = (await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle()) as {
    data: BookingStateRow | null;
    error: { message?: string } | null;
  };

  if (readError) return { ok: false, message: MESSAGES.failed };
  if (!row) return { ok: false, message: MESSAGES.bookingGone };

  if (!canTransitionBooking(row.status, status, "admin")) {
    return {
      ok: false,
      message:
        bookingTransitionFailure(row.status, status, "admin") ??
        MESSAGES.invalidBookingTransition,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    // Optimistic guard: only the status we just read may be replaced.
    .eq("status", row.status)
    .select("id")
    .maybeSingle();

  if (updateError) return { ok: false, message: MESSAGES.failed };
  if (!updated) return { ok: false, message: MESSAGES.bookingChanged };

  return { ok: true };
}
