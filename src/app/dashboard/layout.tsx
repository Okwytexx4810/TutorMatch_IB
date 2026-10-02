import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { studentNavItems } from "@/lib/navigation";

/**
 * Chrome for the student/parent area (`/dashboard/*`).
 *
 * Authorization is not enforced here yet: Supabase Auth arrives in Phase 3,
 * after which `requireUser()` guards this layout server-side.
 */
export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return <DashboardShell navItems={studentNavItems}>{children}</DashboardShell>;
}
