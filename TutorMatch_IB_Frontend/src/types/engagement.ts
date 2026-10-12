import type { DayPeriod, WeekDay } from "./domain";

/** Lifecycle of a tutor request, from submission to booking. */
export const REQUEST_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Lifecycle of a booking created from an accepted request. */
export const BOOKING_STATUSES = [
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** A preferred weekly slot attached to a request. */
export interface RequestSlot {
  day: WeekDay;
  period: DayPeriod;
}

export interface TutorRequest {
  id: string;
  /** The `profiles.id` of the student or parent who made the request. */
  requesterId: string;
  /** The `tutor_profiles.id` of the tutor receiving the request. */
  tutorId: string;
  subject: string;
  /** Educational level requested, matching a level the tutor teaches. */
  level?: string | null;
  /** Preferred meeting location, from the approved Ibadan list. */
  location?: string | null;
  message: string;
  preferredSlots: RequestSlot[];
  /** Proposed rate the requester has in mind, in naira. */
  budget?: number | null;
  status: RequestStatus;
  respondedAt?: string | null;
  createdAt: string;
}

export interface Booking {
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
  notes?: string | null;
  createdAt: string;
}

/** Badge variants used across the app's status chips. */
export type StatusVariant = "default" | "secondary" | "destructive" | "outline";

export interface StatusMeta {
  label: string;
  variant: StatusVariant;
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, StatusMeta> = {
  pending: { label: "Pending", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  declined: { label: "Declined", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, StatusMeta> = {
  confirmed: { label: "Confirmed", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline" },
  no_show: { label: "No-show", variant: "destructive" },
};

export interface Review {
  id: string;
  bookingId: string;
  tutorId: string;
  authorId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}
