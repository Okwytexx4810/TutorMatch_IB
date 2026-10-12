import { getProfile, getUser } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  isMissingColumnError,
  isUniqueViolationError,
} from "@/lib/supabase/compat";
import { getCurrentTutorProfile } from "@/lib/supabase/queries/tutor-profile";
import { normalize } from "@/lib/utils/format";
import type { TutorRequestInput } from "@/lib/validation/engagement";
import type { RequestStatus } from "@/types/engagement";

/**
 * Write helpers for tutor requests.
 *
 * Server-only by convention, per `lib/supabase/README.md`. Three rules hold for
 * every function in this file:
 *
 * 1. **Ownership is derived, never received.** No function takes a requester or
 *    tutor id; the actor is always the request session. A caller cannot express
 *    "act for somebody else" even by accident.
 * 2. **The request-scoped client is used, never the service role.** Every write
 *    passes through the request RLS policies. `tutor_requests_requester_insert`,
 *    `tutor_requests_requester_cancel` and `tutor_requests_tutor_respond` (Stage
 *    C) are the security boundary this layer is a convenience on top of.
 * 3. **Only granted columns are written.** A request is created with the
 *    requester id from the session, a status left to the column default, and
 *    `responded_at` only ever touched by the tutor's response.
 */

const MESSAGES = {
  signedOut: "Your session has expired. Please sign in again.",
  failed: "We could not complete that just now. Please try again.",
  tutorGone: "That tutor is no longer available.",
  notOffer: "That subject at that level is not one of this tutor's offerings.",
  duplicatePending:
    "You already have a pending request with this tutor. You can cancel it from your requests page.",
  staleRequest: "This request is no longer pending.",
  notTutor: "Only tutor accounts can respond to requests.",
  noTutorProfile: "Create your tutor profile before responding to requests.",
} as const;

export type SaveTutorRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; message: string };

/**
 * A tutor subject offering as stored in `tutor_subjects`.
 */
interface SubjectOffering {
  subject: string;
  level: string;
}

interface TutorOfferingsRow {
  id: string;
  tutor_subjects: SubjectOffering[] | null;
}

/**
 * Create a requester's request for a tutor.
 *
 * The submitted `tutorId` is only a reference: the tutor and their real
 * offerings are re-read from the database, and `subject` is stored in that
 * tutor's canonical spelling, so a request can never name a subject or level
 * the tutor has not listed. The requester comes from the session. Duplicate
 * pending requests are rejected by the `one_pending_request_per_pair` partial
 * unique index and surfaced here as a friendly conflict instead of a raw key
 * violation.
 */
export async function createTutorRequest(
  input: TutorRequestInput,
): Promise<SaveTutorRequestResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  const supabase = await getServerSupabase();

  const { data: tutor, error: tutorError } = (await supabase
    .from("tutor_profiles")
    .select("id, tutor_subjects ( subject, level )")
    .eq("id", input.tutorId)
    .maybeSingle()) as {
    data: TutorOfferingsRow | null;
    error: { message?: string } | null;
  };

  if (tutorError) return { ok: false, message: MESSAGES.failed };
  if (!tutor) return { ok: false, message: MESSAGES.tutorGone };

  const requestedSubject = normalize(input.subject);
  const requestedLevel = normalize(input.level);
  const match = (tutor.tutor_subjects ?? []).find(
    (offering) =>
      normalize(offering.subject) === requestedSubject &&
      normalize(offering.level) === requestedLevel,
  );
  if (!match) return { ok: false, message: MESSAGES.notOffer };

  const baseRow = {
    // Derived, never accepted from the payload.
    requester_id: user.id,
    tutor_id: input.tutorId,
    // Canonical spelling from the tutor's offerings, not the submission.
    subject: match.subject,
    message: input.message ?? "",
    preferred_slots: [{ day: input.day, period: input.period }],
    budget: input.budget ?? null,
  };

  // `level` and `location` are Stage C columns. On an environment where that
  // migration is not applied they do not exist, so the insert is attempted with
  // them and, only on a missing-column error, retried without them — the same
  // grace the request reads already give those columns.
  let insertResult = await supabase
    .from("tutor_requests")
    .insert({ ...baseRow, level: input.level, location: input.location })
    .select("id")
    .maybeSingle();

  if (insertResult.error && isMissingColumnError(insertResult.error, "level")) {
    insertResult = await supabase
      .from("tutor_requests")
      .insert(baseRow)
      .select("id")
      .maybeSingle();
  }

  const { data, error: insertError } = insertResult;

  if (insertError) {
    if (isUniqueViolationError(insertError)) {
      return { ok: false, message: MESSAGES.duplicatePending };
    }
    return { ok: false, message: MESSAGES.failed };
  }
  if (!data) return { ok: false, message: MESSAGES.failed };

  return { ok: true, requestId: data.id };
}

export type CancelRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; message: string };

/**
 * Withdraw a requester's own pending request.
 *
 * Guards are in the UPDATE itself: the statement targets rows that are both
 * `requester_id = session` and still `pending`, and the requester-cancel RLS
 * policy encodes the same `pending -> cancelled` transition, so there is no
 * window where a request past `pending` can be withdrawn.
 */
export async function cancelRequesterRequest(
  requestId: string,
): Promise<CancelRequestResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("tutor_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("requester_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: MESSAGES.failed };
  if (!data) return { ok: false, message: MESSAGES.staleRequest };

  return { ok: true, requestId: data.id };
}

export type RespondToRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; message: string };

/**
 * Accept or decline a request addressed to the signed-in tutor's profile.
 *
 * The tutor's profile id is resolved from the session (`tutor_profiles` is
 * keyed to the owning profile), so the statement can only match requests
 * actually addressed to this tutor. Combined with the `pending` filter and the
 * `tutor_requests_tutor_respond` policy, a request can be answered exactly
 * once and never un-answered.
 */
export async function respondToRequestAsTutor(
  requestId: string,
  response: Extract<RequestStatus, "accepted" | "declined">,
): Promise<RespondToRequestResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  const profile = await getProfile();
  if (!profile || profile.role !== "tutor") {
    return { ok: false, message: MESSAGES.notTutor };
  }

  const tutorProfile = await getCurrentTutorProfile();
  if (!tutorProfile) return { ok: false, message: MESSAGES.noTutorProfile };

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("tutor_requests")
    .update({
      status: response,
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("tutor_id", tutorProfile.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: MESSAGES.failed };
  if (!data) return { ok: false, message: MESSAGES.staleRequest };

  return { ok: true, requestId: data.id };
}