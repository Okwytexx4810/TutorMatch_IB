import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { tutorNavItems } from "@/lib/navigation";

/**
 * Chrome for the tutor area (`/tutor/*`).
 *
 * Phase 3 replaces this with a tutor-only authorization check. A user with no
 * tutor profile must not reach these routes even if the URL is known.
 */
export default function TutorLayout({ children }: LayoutProps<"/tutor">) {
  return <DashboardShell navItems={tutorNavItems}>{children}</DashboardShell>;
}
