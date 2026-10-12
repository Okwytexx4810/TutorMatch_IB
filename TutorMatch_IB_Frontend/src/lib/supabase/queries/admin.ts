import { getServerSupabase } from "@/lib/supabase/server";
import { isRequestSlot } from "@/lib/validation/engagement";
import type { UserRole } from "@/types/domain";
import type {
  BookingStatus,
  RequestSlot,
  RequestStatus,
} from "@/types/engagement";

/**
 * Read helpers for the administrator console.
 *
 * Server-only by convention, per `lib/supabase/README.md`. Every read runs as the
 * signed-in caller, and the only thing that makes these cross-user reads legal is
 * the `is_admin()` clause the base schema already carries on
 * `profiles_select_admin`, `tutor_requests_party_read` and `bookings_party_read`.
 * The admin layout's `requireRole(["admin"])` is what guarantees the caller is an
 * administrator; these queries add no authority of their own.
 */

/** PostgREST returns a to-one embed as an object; tolerate an array too. */
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/* -------------------------------------------------------------------------- */
/*  Platform statistics                                                        */
/* -------------------------------------------------------------------------- */

export interface AdminStats {
  /** All accounts. */
  users: number;
  /** Students and parents — the people who send applications. */
  learners: number;
  tutors: number;
  requests: number;
  pendingRequests: number;
  bookings: number;
  isError: boolean;
}

const HEAD = { count: "exact" as const, head: true };

/**
 * Aggregate counts for the overview. `head: true` asks PostgREST for the count
 * only, so no rows cross the wire. RLS still narrows the count, which is exactly
 * what an administrator should see: everything.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await getServerSupabase();

  const [profiles, learners, tutors, requests, pending, bookings] =
    await Promise.all([
      supabase.from("profiles").select("*", HEAD),
      supabase.from("profiles").select("*", HEAD).in("role", ["student", "parent"]),
      supabase.from("tutor_profiles").select("*", HEAD),
      supabase.from("tutor_requests").select("*", HEAD),
      supabase.from("tutor_requests").select("*", HEAD).eq("status", "pending"),
      supabase.from("bookings").select("*", HEAD),
    ]);

  const results = [profiles, learners, tutors, requests, pending, bookings];

  return {
    users: profiles.count ?? 0,
    learners: learners.count ?? 0,
    tutors: tutors.count ?? 0,
    requests: requests.count ?? 0,
    pendingRequests: pending.count ?? 0,
    bookings: bookings.count ?? 0,
    isError: results.some((result) => Boolean(result.error)),
  };
}

/* -------------------------------------------------------------------------- */
/*  Applications (tutor requests)                                              */
/* -------------------------------------------------------------------------- */

export interface AdminRequester {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface AdminTutorRef {
  id: string;
  displayName: string;
  headline: string | null;
}

export interface AdminRequestListItem {
  id: string;
  requesterId: string;
  tutorId: string;
  subject: string;
  level: string | null;
  location: string | null;
  message: string;
  preferredSlots: RequestSlot[];
  budget: number | null;
  status: RequestStatus;
  respondedAt: string | null;
  createdAt: string;
  /** Who applied. Readable because an admin may read every profile. */
  requester: AdminRequester | null;
  /** The tutor the application is addressed to. */
  tutor: AdminTutorRef | null;
}

export interface AdminRequestsResult {
  requests: AdminRequestListItem[];
  isError: boolean;
  errorMessage: string | null;
}

const ADMIN_REQUEST_COLUMNS =
  "id, requester_id, tutor_id, subject, level, location, message, preferred_slots, budget, status, responded_at, created_at, " +
  "requester:profiles!requester_id ( id, full_name, email, role ), " +
  "tutor:tutor_profiles!tutor_id ( id, display_name, headline )";

interface AdminRequestRow {
  id: string;
  requester_id: string;
  tutor_id: string;
  subject: string;
  level: string | null;
  location: string | null;
  message: string;
  preferred_slots: unknown;
  budget: number | null;
  status: RequestStatus;
  responded_at: string | null;
  created_at: string;
  requester:
    | { id: string; full_name: string; email: string; role: UserRole }
    | { id: string; full_name: string; email: string; role: UserRole }[]
    | null;
  tutor:
    | { id: string; display_name: string | null; headline: string | null }
    | { id: string; display_name: string | null; headline: string | null }[]
    | null;
}

/**
 * Every application on the platform, newest first. Pending applications sort to
 * the top so the administrator's queue is what they see first.
 */
export async function getAdminRequests(): Promise<AdminRequestsResult> {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("tutor_requests")
    .select(ADMIN_REQUEST_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return { requests: [], isError: true, errorMessage: error.message };
  }

  const rows = (data as unknown as AdminRequestRow[] | null) ?? [];

  const requests = rows.map((row): AdminRequestListItem => {
    const requester = firstOf(row.requester);
    const tutor = firstOf(row.tutor);

    return {
      id: row.id,
      requesterId: row.requester_id,
      tutorId: row.tutor_id,
      subject: row.subject,
      level: row.level,
      location: row.location,
      message: row.message,
      preferredSlots: Array.isArray(row.preferred_slots)
        ? row.preferred_slots.filter(isRequestSlot)
        : [],
      budget: row.budget,
      status: row.status,
      respondedAt: row.responded_at,
      createdAt: row.created_at,
      requester: requester
        ? {
            id: requester.id,
            fullName: requester.full_name,
            email: requester.email,
            role: requester.role,
          }
        : null,
      tutor: tutor
        ? {
            id: tutor.id,
            displayName: tutor.display_name?.trim() || tutor.headline || "",
            headline: tutor.headline,
          }
        : null,
    };
  });

  return { requests, isError: false, errorMessage: null };
}

/* -------------------------------------------------------------------------- */
/*  Tutors                                                                     */
/* -------------------------------------------------------------------------- */

export interface AdminTutorListItem {
  id: string;
  profileId: string;
  displayName: string | null;
  headline: string | null;
  location: string;
  hourlyRate: number;
  yearsOfExperience: number;
  isVerified: boolean;
  profileCompleteness: number;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  subjects: string[];
}

export interface AdminTutorsResult {
  tutors: AdminTutorListItem[];
  isError: boolean;
  errorMessage: string | null;
}

const ADMIN_TUTOR_COLUMNS =
  "id, profile_id, display_name, headline, location, hourly_rate, years_of_experience, is_verified, profile_completeness, created_at, " +
  "owner:profiles!profile_id ( full_name, email ), " +
  "tutor_subjects ( subject )";

interface AdminTutorRow {
  id: string;
  profile_id: string;
  display_name: string | null;
  headline: string | null;
  location: string;
  hourly_rate: number;
  years_of_experience: number;
  is_verified: boolean;
  profile_completeness: number;
  created_at: string;
  owner:
    | { full_name: string; email: string }
    | { full_name: string; email: string }[]
    | null;
  tutor_subjects: Array<{ subject: string }> | null;
}

/** Every tutor profile, newest first, with its owning account and offerings. */
export async function getAdminTutors(): Promise<AdminTutorsResult> {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("tutor_profiles")
    .select(ADMIN_TUTOR_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return { tutors: [], isError: true, errorMessage: error.message };
  }

  const rows = (data as unknown as AdminTutorRow[] | null) ?? [];

  const tutors = rows.map((row): AdminTutorListItem => {
    const owner = firstOf(row.owner);
    return {
      id: row.id,
      profileId: row.profile_id,
      displayName: row.display_name,
      headline: row.headline,
      location: row.location,
      hourlyRate: row.hourly_rate,
      yearsOfExperience: row.years_of_experience,
      isVerified: row.is_verified,
      profileCompleteness: row.profile_completeness,
      createdAt: row.created_at,
      ownerName: owner?.full_name ?? "Unknown",
      ownerEmail: owner?.email ?? "",
      subjects: (row.tutor_subjects ?? [])
        .map((subject) => subject.subject)
        .sort((a, b) => a.localeCompare(b)),
    };
  });

  return { tutors, isError: false, errorMessage: null };
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                      */
/* -------------------------------------------------------------------------- */

export interface AdminUserListItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone: string | null;
  location: string | null;
  createdAt: string;
}

export interface AdminUsersResult {
  users: AdminUserListItem[];
  isError: boolean;
  errorMessage: string | null;
}

/** Every account, newest first. */
export async function getAdminUsers(): Promise<AdminUsersResult> {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone, location, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return { users: [], isError: true, errorMessage: error.message };
  }

  const rows =
    (data as unknown as {
      id: string;
      full_name: string;
      email: string;
      role: UserRole;
      phone: string | null;
      location: string | null;
      created_at: string;
    }[] | null) ?? [];

  return {
    users: rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      phone: row.phone,
      location: row.location,
      createdAt: row.created_at,
    })),
    isError: false,
    errorMessage: null,
  };
}

/* -------------------------------------------------------------------------- */
/*  Bookings (sessions)                                                        */
/* -------------------------------------------------------------------------- */

export interface AdminBookingListItem {
  id: string;
  requestId: string | null;
  tutorId: string;
  requesterId: string;
  subject: string;
  startsAt: string;
  endsAt: string;
  /** Price agreed for this session, in naira. */
  agreedRate: number;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  /** Who booked the session. Readable because an admin may read every profile. */
  requester: AdminRequester | null;
  /** The tutor the session is with. */
  tutor: AdminTutorRef | null;
}

export interface AdminBookingsResult {
  bookings: AdminBookingListItem[];
  isError: boolean;
  errorMessage: string | null;
}

const ADMIN_BOOKING_COLUMNS =
  "id, request_id, tutor_id, requester_id, subject, starts_at, ends_at, agreed_rate, status, notes, created_at, " +
  "requester:profiles!requester_id ( id, full_name, email, role ), " +
  "tutor:tutor_profiles!tutor_id ( id, display_name, headline )";

interface AdminBookingRow {
  id: string;
  request_id: string | null;
  tutor_id: string;
  requester_id: string;
  subject: string;
  starts_at: string;
  ends_at: string;
  agreed_rate: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  requester:
    | { id: string; full_name: string; email: string; role: UserRole }
    | { id: string; full_name: string; email: string; role: UserRole }[]
    | null;
  tutor:
    | { id: string; display_name: string | null; headline: string | null }
    | { id: string; display_name: string | null; headline: string | null }[]
    | null;
}

/**
 * Every booking on the platform, soonest session first. The `is_admin()`
 * clause on `bookings_party_read` is what makes these cross-party rows legal;
 * the admin layout's `requireRole` guarantees the caller is an administrator.
 */
export async function getAdminBookings(): Promise<AdminBookingsResult> {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("bookings")
    .select(ADMIN_BOOKING_COLUMNS)
    .order("starts_at", { ascending: false });

  if (error) {
    return { bookings: [], isError: true, errorMessage: error.message };
  }

  const rows = (data as unknown as AdminBookingRow[] | null) ?? [];

  const bookings = rows.map((row): AdminBookingListItem => {
    const requester = firstOf(row.requester);
    const tutor = firstOf(row.tutor);

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
      requester: requester
        ? {
            id: requester.id,
            fullName: requester.full_name,
            email: requester.email,
            role: requester.role,
          }
        : null,
      tutor: tutor
        ? {
            id: tutor.id,
            displayName: tutor.display_name?.trim() || tutor.headline || "",
            headline: tutor.headline,
          }
        : null,
    };
  });

  return { bookings, isError: false, errorMessage: null };
}
