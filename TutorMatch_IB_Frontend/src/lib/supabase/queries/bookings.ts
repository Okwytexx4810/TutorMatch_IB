import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/compat";
import type { Booking } from "@/types/engagement";
import type { RequestTutorSummary } from "@/lib/supabase/queries/requests";

/**
 * Read helpers for bookings.
 *
 * Server-only by convention, per `lib/supabase/README.md`. Reads run as the
 * signed-in caller, so `bookings_party_read` narrows every result to the two
 * parties of a booking. Like the request queries, `profiles` is never joined:
 * neither party is exposed through the cross-party rows.
 */

const BOOKING_COLUMNS =
  "id, request_id, tutor_id, requester_id, subject, starts_at, ends_at, agreed_rate, status, notes, created_at";

/** Tutor display details embedded on a requester's booking list. */
export interface BookingListItem extends Omit<Booking, "tutor"> {
  /** Public display details of the tutor, when the listing is requester-side. */
  tutor: RequestTutorSummary | null;
}

export interface BookingsQueryResult<T> {
  bookings: T[];
  /** Presence of an error. The message is for the server log only. */
  isError: boolean;
  /** Server-side detail; never rendered to visitors. */
  errorMessage: string | null;
}

interface BookingRow {
  id: string;
  request_id: string | null;
  tutor_id: string;
  requester_id: string;
  subject: string;
  starts_at: string;
  ends_at: string;
  agreed_rate: number;
  status: Booking["status"];
  notes: string | null;
  created_at: string;
}

const SUCCESS = <T>(bookings: T[]): BookingsQueryResult<T> => ({
  bookings,
  isError: false,
  errorMessage: null,
});

function toBookingListItem(row: BookingRow): BookingListItem {
  return {
    id: row.id,
    requestId: row.request_id,
    tutorId: row.tutor_id,
    requesterId: row.requester_id,
    subject: row.subject,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    agreedRate: row.agreed_rate,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    tutor: null,
  };
}

async function queryPartyBookings(
  column: "requester_id" | "tutor_id",
  partyId: string,
  withTutor: boolean,
): Promise<BookingsQueryResult<BookingListItem>> {
  const supabase = await getServerSupabase();

  const buildQuery = (includeDisplayName: boolean) => {
    const embed = includeDisplayName
      ? "tutor_profiles ( id, display_name, headline )"
      : "tutor_profiles ( id, headline )";
    const columns: string = withTutor
      ? `${BOOKING_COLUMNS}, ${embed}`
      : BOOKING_COLUMNS;
    return supabase
      .from("bookings")
      .select(columns)
      .eq(column, partyId)
      .order("starts_at", { ascending: false });
  };

  let result = await buildQuery(true);
  if (result.error && isMissingColumnError(result.error, "display_name")) {
    result = await buildQuery(false);
  }

  if (result.error) {
    return { bookings: [], isError: true, errorMessage: result.error.message };
  }

  const rows = result.data as unknown as (BookingRow & {
    tutor_profiles: Array<{
      id: string;
      display_name?: string | null;
      headline: string | null;
    }> | null;
  })[];

  const bookings = rows.map((row) => {
    const tutorRow = row.tutor_profiles?.[0] ?? null;
    return {
      ...toBookingListItem(row),
      tutor: tutorRow
        ? {
            id: tutorRow.id,
            displayName: tutorRow.display_name?.trim() ?? tutorRow.headline ?? "",
            headline: tutorRow.headline,
          }
        : null,
    };
  });

  return SUCCESS(bookings);
}

/**
 * The requester's bookings, newest first, each with the tutor's public display
 * details. RLS restricts to rows where `requester_id` is the caller.
 */
export async function getRequesterBookings(
  requesterId: string,
): Promise<BookingsQueryResult<BookingListItem>> {
  return queryPartyBookings("requester_id", requesterId, true);
}

/**
 * The bookings for one tutor profile, newest first. RLS restricts to the
 * profile owner; only the tutor's own details would be embedded, so none is.
 */
export async function getTutorBookings(
  tutorId: string,
): Promise<BookingsQueryResult<BookingListItem>> {
  return queryPartyBookings("tutor_id", tutorId, false);
}