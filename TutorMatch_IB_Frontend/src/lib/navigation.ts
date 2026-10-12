import {
  CalendarClock,
  CalendarDays,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Search,
  UserRound,
  Users,
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
  { href: ROUTES.findTutors, label: "Find a tutor", icon: Search },
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
 * Admin navigation. Applications are the primary queue; sessions, tutor and
 * user directories sit alongside it.
 */
export const adminNavItems: readonly NavItem[] = [
  { href: ROUTES.admin, label: "Overview", icon: LayoutDashboard },
  { href: ROUTES.adminRequests, label: "Applications", icon: Inbox },
  { href: ROUTES.adminBookings, label: "Sessions", icon: CalendarDays },
  { href: ROUTES.adminTutors, label: "Tutors", icon: GraduationCap },
  { href: ROUTES.adminUsers, label: "Users", icon: Users },
];

