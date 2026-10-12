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
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3001",
  contactEmail: "support@tutormatch.ng",
  contactPhone: "+23437100923",
} as const;

export const ROUTES = {
  home: "/",
  findTutors: "/find-tutors",
  tutorProfile: (id: string) => `/tutors/${id}` as const,
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  authCallback: "/auth/callback",
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
  adminRequests: "/admin/requests",
  adminTutors: "/admin/tutors",
  adminUsers: "/admin/users",
  adminBookings: "/admin/bookings",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
} as const;

/** Primary navigation shown on public pages. Anchors resolve on the home page. */
export const publicNavLinks = [
  { href: ROUTES.findTutors, label: "Find Tutors" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#for-tutors", label: "For Tutors" },
  { href: ROUTES.about, label: "About" },
  { href: ROUTES.contact, label: "Contact" },
] as const;
