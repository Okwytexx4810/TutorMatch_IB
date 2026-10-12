import { getUser } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  isBookingStartInPastError,
  isBookingTutorMissingError,
  isExclusionViolationError,
  isUniqueViolationError,
} from "@/lib/supabase/compat";
import {
  bookingTransitionFailure,
  canTransitionBooking,
  type EngagementActor,
} from "@/lib/validation/engagement";
import type { BookingStatus, RequestStatus } from "@/types/engagement";

/**
 * Write helpers for bookings.
 *
 * Server-only by convention, per `lib/supabase/README.md`. The same three rules
 * as the request mutations: ownership is derived from the session, the
 * request-scoped client is used (so the Stage C `bookings` write policies are
 * the real boundary), and only granted columns are written. In particular a
 * booking is never inserted with a status: the column default `confirmed`
 * applies, and later changes go through `changeBookingStatus`.
 */

const MESSAGES = {
  signedOut: "Your session has expired. Please sign in again.",
  failed: "We could not complete that just now. Please try again.",
  requestGone: "That request is no longer available.",
  requestNotAccepted:
    "You can only schedule a session once the tutor has accepted the request.",
  tutorGone: "That tutor is no longer available.",
  startInPast: "Choose a start time that has not already passed.",
  conflict:
    "The tutor already has a session at that time. Please choose a different time.",
  alreadyBooked: "A booking already exists for this request.",
  bookingGone: "That booking is no longer available.",
  bookingChanged: "That booking has just changed. Refresh to see its latest state.",
} as const;

export type ConfirmBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; message: string };

interface AcceptedRequestRow {
  id: string;
  requester_id: string;
  tutor_id: string;
  subject: string;
  status: RequestStatus;
}

/**
 * Create a booking from an accepted request.
 *
 * The request is re-read as the caller, so RLS proves the caller is a party to
 * it. The booking's tutor, requester and subject are copied from that trusted
 * row rather than the payload. `agreed_rate` is deliberately NOT sent: the
 * Stage C1 `prepare_booking` trigger copies the tutor's current `hourly_rate`
 * at insert time, so a client can never set the rate (the column grant was
 * revoked). The insert policy repeats the "accepted request, matching triplet"
 * check independently, and the `no_overlapping_bookings` exclusion turns a
 * double-booking into the friendly conflict below.
 */
export async function scheduleBookingFromRequest(
  requestId: string,
  startsAt: string,
  endsAt: string,
): Promise<ConfirmBookingResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  const supabase = await getServerSupabase();

  const { data: request, error: requestError } = (await supabase
    .from("tutor_requests")
    .select("id, requester_id, tutor_id, subject, status")
    .eq("id", requestId)
    .maybeSingle()) as {
    data: AcceptedRequestRow | null;
    error: { message?: string } | null;
  };

  if (requestError) return { ok: false, message: MESSAGES.failed };
  if (!request) return { ok: false, message: MESSAGES.requestGone };
  if (request.status !== "accepted") {
    return { ok: false, message: MESSAGES.requestNotAccepted };
  }

  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      // Copied from the trusted request row, never from the payload.
      request_id: request.id,
      tutor_id: request.tutor_id,
      requester_id: request.requester_id,
      subject: request.subject,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    if (isExclusionViolationError(insertError)) {
      return { ok: false, message: MESSAGES.conflict };
    }
    if (isUniqueViolationError(insertError)) {
      return { ok: false, message: MESSAGES.alreadyBooked };
    }
    if (isBookingStartInPastError(insertError)) {
      return { ok: false, message: MESSAGES.startInPast };
    }
    if (isBookingTutorMissingError(insertError)) {
      return { ok: false, message: MESSAGES.tutorGone };
    }
    return { ok: false, message: MESSAGES.failed };
  }
  if (!booking) return { ok: false, message: MESSAGES.failed };

  return { ok: true, bookingId: booking.id };
}

export type ChangeBookingStatusResult =
  | { ok: true; bookingId: string; status: BookingStatus }
  | { ok: false; message: string };

interface BookingStateRow {
  id: string;
  status: BookingStatus;
  requester_id: string;
  tutor_id: string;
}

/**
 * Move a booking to a new status, validating the transition in code before it
 * reaches the database.
 *
 * The current status is read first and checked against the same transition map
 * the RLS policy encodes, so an illegal change returns the map's own message
 * rather than a bare permission error. The UPDATE then targets the exact
 * observed status, so two watchers racing to complete or cancel the same
 * booking cannot both succeed: the loser sees `bookingChanged`.
 *
 * `actor` is fixed by the calling server action's `requireRole`, never by the
 * payload.
 */
export async function changeBookingStatus(
  bookingId: string,
  to: BookingStatus,
  actor: EngagementActor,
): Promise<ChangeBookingStatusResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  const supabase = await getServerSupabase();

  const { data: row, error: readError } = (await supabase
    .from("bookings")
    .select("id, status, requester_id, tutor_id")
    .eq("id", bookingId)
    .maybeSingle()) as {
    data: BookingStateRow | null;
    error: { message?: string } | null;
  };

  if (readError) return { ok: false, message: MESSAGES.failed };
  if (!row) return { ok: false, message: MESSAGES.bookingGone };

  if (!canTransitionBooking(row.status, to, actor)) {
    return {
      ok: false,
      message:
        bookingTransitionFailure(row.status, to, actor) ?? MESSAGES.failed,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({ status: to })
    .eq("id", bookingId)
    // Optimistic guard: only the status we just read may be replaced.
    .eq("status", row.status)
    .select("id, status")
    .maybeSingle();

  if (updateError) return { ok: false, message: MESSAGES.failed };
  if (!updated) return { ok: false, message: MESSAGES.bookingChanged };

  return { ok: true, bookingId: updated.id, status: updated.status };
}