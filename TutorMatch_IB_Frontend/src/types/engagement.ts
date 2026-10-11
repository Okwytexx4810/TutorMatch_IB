import type { DayPeriod, WeekDay } from "./domain";

/** Lifecycle of a tutor request, from submission to booking. */export const REQUEST_STATUSES = [
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

export interface TutorRequest {
  id: string;
  /** The `profiles.id` of the student or parent who made the request. */
  requesterId: string;
  /** The `tutor_profiles.id` of the tutor receiving the request. */
  tutorId: string;
  subject: string;
  message: string;
  preferredSlots: { day: WeekDay; period: DayPeriod }[];
  status: RequestStatus;
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
  notes?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  tutorId: string;
  authorId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}
