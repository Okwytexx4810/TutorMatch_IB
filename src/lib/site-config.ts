/**
 * Static, build-safe application constants.
 *
 * Deliberately has no dependency on `process.env` so it can be imported from
 * Client Components and route metadata.
 */
export const siteConfig = {
  name: "TutorMatch IB",
  description:
    "Describe what you need in plain English and TutorMatch IB matches you with verified tutors by subject, location, availability, budget and experience.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000",
  contactEmail: "support@tutormatch.ng",
} as const;

export const ROUTES = {
  home: "/",
  findTutors: "/find-tutors",
  tutorProfile: (id: string) => `/tutors/${id}` as const,
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  dashboardFindTutor: "/dashboard/find-tutor",
  dashboardRequests: "/dashboard/requests",
  dashboardBookings: "/dashboard/bookings",
  dashboardProfile: "/dashboard/profile",
  tutorDashboard: "/tutor/dashboard",
  tutorProfileSettings: "/tutor/profile",
  tutorAvailability: "/tutor/availability",
  tutorRequests: "/tutor/requests",
  tutorBookings: "/tutor/bookings",
  admin: "/admin",
} as const;

/** Primary navigation shown on public pages. */
export const publicNavLinks = [
  { href: ROUTES.findTutors, label: "Find tutors" },
  { href: ROUTES.tutorDashboard, label: "Teach on TutorMatch" },
] as const;
