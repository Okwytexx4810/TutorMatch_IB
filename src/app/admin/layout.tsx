import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { adminNavItems } from "@/lib/navigation";

/**
 * Chrome for the admin area (`/admin`).
 *
 * Phase 3 adds an admin-only authorization check here. This layout must never
 * be reachable by a student, parent or tutor.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <DashboardShell navItems={adminNavItems}>{children}</DashboardShell>;
}
