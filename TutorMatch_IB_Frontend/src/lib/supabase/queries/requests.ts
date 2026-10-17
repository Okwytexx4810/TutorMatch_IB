import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/compat";
import type {
  BookingStatus,
  RequestSlot,
  RequestStatus,
  TutorRequest,
} from "@/types/engagement";
import { isRequestSlot } from "@/lib/validation/engagement";

/**
 * Read helpers for tutor requests.
 *
 * Server-only by convention, per `lib/supabase/README.md`. Reads run as the
 * signed-in caller, so RLS narrows every result to the parties of a request
 * (`tutor_requests_party_read`): a requester sees their own outbound requests,
 * a tutor the requests addressed to their own tutor profile. `profiles` is
 * never joined because it has no cross-user read policy, so neither side sees
 * the other party's name or contact details — request rows are the shared
 * surface.
 *
 * `level` and `location` are columns added by the Stage C migration. Until it
 * is applied those columns do not exist, so the queries fall back to the base
 * column set (the same grace the Stage B `display_name` column gets elsewhere).
 */

/** Request columns including the Stage C `level`/`location` pair. */
const REQUEST_COLUMNS =
  "id, requester_id, tutor_id, subject, level, location, message, preferred_slots, budget, status, responded_at, created_at";

/** Same, for environments where the Stage C migration is not applied. */
const REQUEST_COLUMNS_BASE =
  "id, requester_id, tutor_id, subject, message, preferred_slots, budget, status, responded_at, created_at";

const TUTOR_EMBED = "tutor_profiles ( id, display_name, headline )";
const TUTOR_EMBED_BASE = "tutor_profiles ( id, headline )";

/** Tutor display details embedded on a requester's request list. */
export interface RequestTutorSummary {
  id: string;
  displayName: string;
  headline: string | null;
}

export interface RequestListItem extends Omit<TutorRequest, "requesterId" | "preferredSlots"> {
  requesterId: string;
  preferredSlots: RequestSlot[];
}

/** A request as the requester sees it, with the tutor's public details. */
export interface RequesterRequestListItem extends RequestListItem {
  tutor: RequestTutorSummary | null;
}

/** A request as the addressed tutor sees it. */
export interface TutorRequestListItem extends RequestListItem {
  /** Whether the accepted request already produced a confirmed booking. */
  hasConfirmedBooking: boolean;
}

export interface RequestsQueryResult<T> {
  requests: T[];
  /** Presence of an error. The message is for the server log only. */
  isError: boolean;
  /** Server-side detail; never rendered to visitors. */
  errorMessage: string | null;
}

interface RequestRow {
  id: string;
  requester_id: string;
  tutor_id: string;
  subject: string;
  level?: string | null;
  location?: string | null;
  message: string;
  preferred_slots: unknown;
  budget: number | null;
  status: RequestStatus;
  responded_at: string | null;
  created_at: string;
}

/** PostgREST returns a to-one embed as an object and a to-many embed as an array. */
function asList<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toRequestListItem(row: RequestRow): RequestListItem {
  return {
    id: row.id,
    requesterId: row.requester_id,
    tutorId: row.tutor_id,
    subject: row.subject,
    level: row.level ?? null,
    location: row.location ?? null,
    message: row.message,
    preferredSlots: Array.isArray(row.preferred_slots)
      ? row.preferred_slots.filter(isRequestSlot)
      : [],
    budget: row.budget ?? null,
    status: row.status,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
  };
}

const TUTOR_INBOX_ORDER: Record<RequestStatus, number> = {
  pending: 0,
  accepted: 1,
  declined: 2,
  cancelled: 3,
};

/**
 * The requester's outbound requests, newest first, each with the addressed
 * tutor's public display details (the `display_name` they chose; no `profiles`
 * data is exposed).
 */
export async function getRequesterRequests(
  requesterId: string,
): Promise<RequestsQueryResult<RequesterRequestListItem>> {
  const supabase = await getServerSupabase();

  const buildQuery = (includeDisplayName: boolean) => {
    const columns: string = includeDisplayName
      ? `${REQUEST_COLUMNS}, ${TUTOR_EMBED}`
      : `${REQUEST_COLUMNS_BASE}, ${TUTOR_EMBED_BASE}`;
    return supabase
      .from("tutor_requests")
      .select(columns)
      .eq("requester_id", requesterId)
      .order("created_at", { ascending: false });
  };

  let result = await buildQuery(true);
  if (result.error && isMissingColumnError(result.error, "display_name")) {
    result = await buildQuery(false);
  }
  if (result.error && isMissingColumnError(result.error, "level")) {
    result = await buildQuery(false);
  }

  if (result.error) {
    return { requests: [], isError: true, errorMessage: result.error.message };
  }

  const rows = result.data as unknown as (RequestRow & {
    tutor_profiles: Array<{
      id: string;
      display_name?: string | null;
      headline: string | null;
    }> | null;
  })[];

  return {
    requests: rows.map((row) => {
      const tutorRow = asList(row.tutor_profiles)[0] ?? null;
      return {
        ...toRequestListItem(row),
        tutor: tutorRow
          ? {
              id: tutorRow.id,
              displayName: tutorRow.display_name?.trim() ?? tutorRow.headline ?? "",
              headline: tutorRow.headline,
            }
          : null,
      };
    }),
    isError: false,
    errorMessage: null,
  };
}

/**
 * The requests addressed to one tutor profile: pending first, then newest.
 * RLS restricts this to the owner of that tutor profile. Tutor-specific extra:
 * whether an accepted request already produced a confirmed booking, so the
 * inbox can offer scheduling once and stop offering it after a booking exists.
 */
export async function getTutorRequests(
  tutorId: string,
): Promise<RequestsQueryResult<TutorRequestListItem>> {
  const supabase = await getServerSupabase();

  const buildQuery = (includeLevelLocation: boolean) => {
    const columns: string = includeLevelLocation
      ? REQUEST_COLUMNS
      : REQUEST_COLUMNS_BASE;
    return supabase
      .from("tutor_requests")
      .select(`${columns}, bookings ( status )`)
      .eq("tutor_id", tutorId);
  };

  const buildPlainQuery = (includeLevelLocation: boolean) => {
    const columns: string = includeLevelLocation
      ? REQUEST_COLUMNS
      : REQUEST_COLUMNS_BASE;
    return supabase.from("tutor_requests").select(columns).eq("tutor_id", tutorId);
  };

  type InboxQuery = {
    data: unknown;
    error: { code?: string; message?: string } | null;
  };

  let result = (await buildQuery(true)) as InboxQuery;
  if (result.error && isMissingColumnError(result.error, "level")) {
    result = (await buildQuery(false)) as InboxQuery;
  }

  // `bookings.request_id` is a unique foreign key, and a missing relationship
  // (Stage C not applied) makes the embed fail. Either way the inbox must still
  // list the requests so the tutor can accept or decline them.
  if (result.error) {
    const plain = (await buildPlainQuery(
      !isMissingColumnError(result.error, "level"),
    )) as InboxQuery;
    result =
      plain.error && isMissingColumnError(plain.error, "level")
        ? ((await buildPlainQuery(false)) as InboxQuery)
        : plain;
  }

  if (result.error) {
    return {
      requests: [],
      isError: true,
      errorMessage: result.error.message ?? null,
    };
  }

  const rows = result.data as unknown as (RequestRow & {
    bookings?: { status: BookingStatus } | Array<{ status: BookingStatus }> | null;
  })[];

  const requests = rows
    .map((row): TutorRequestListItem => ({
      ...toRequestListItem(row),
      hasConfirmedBooking: asList(row.bookings).some(
        (booking) => booking.status === "confirmed",
      ),
    }))
    .sort((a, b) => {
      const byStatus = TUTOR_INBOX_ORDER[a.status] - TUTOR_INBOX_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      return b.createdAt.localeCompare(a.createdAt);
    });

  return { requests, isError: false, errorMessage: null };
}