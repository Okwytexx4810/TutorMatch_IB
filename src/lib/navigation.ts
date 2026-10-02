import {
  CalendarClock,
  CalendarDays,
  Inbox,
  LayoutDashboard,
  Search,
  UserRound,
} from "lucide-react";

import type { NavItem } from "@/components/dashboard/dashboard-sidebar";
import { ROUTES } from "@/lib/site-config";

/**
 * Sidebar definitions for the three authenticated areas.
 *
 * Centralised so the navigation model can be reviewed in one place and reused
 * by the mobile drawer once it is built.
 */

export const studentNavItems: readonly NavItem[] = [
  { href: ROUTES.dashboard, label: "Overview", icon: LayoutDashboard },
  { href: ROUTES.dashboardFindTutor, label: "Find a tutor", icon: Search },
  { href: ROUTES.dashboardRequests, label: "My requests", icon: Inbox },
  { href: ROUTES.dashboardBookings, label: "Bookings", icon: CalendarDays },
  { href: ROUTES.dashboardProfile, label: "Profile", icon: UserRound },
];

export const tutorNavItems: readonly NavItem[] = [
  { href: ROUTES.tutorDashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.tutorRequests, label: "Requests", icon: Inbox },
  { href: ROUTES.tutorBookings, label: "Bookings", icon: CalendarDays },
  { href: ROUTES.tutorAvailability, label: "Availability", icon: CalendarClock },
  { href: ROUTES.tutorProfileSettings, label: "My profile", icon: UserRound },
];

/**
 * Admin navigation. Phase 10 adds the tutors / students / requests sub-routes;
 * until those routes exist they must not be linked, because `typedRoutes`
 * rejects links to routes that are not in the build.
 */
export const adminNavItems: readonly NavItem[] = [
  { href: ROUTES.admin, label: "Overview", icon: LayoutDashboard },
];

