import { SignOutButton } from "@/components/forms/sign-out-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { tutorNavItems } from "@/lib/navigation";
import { ROUTES } from "@/lib/site-config";

/**
 * Chrome for the tutor area (`/tutor/*`).
 *
 * Tutor-only. The check reads the trusted `profiles.role` from the database,
 * not `user_metadata`, so holding a tutor-shaped claim in metadata grants
 * nothing. A signed-in student is redirected to their own dashboard.
 *
 * `force-dynamic` keeps the guard from being frozen into a build-time snapshot.
 */
export const dynamic = "force-dynamic";

export default async function TutorLayout({ children }: LayoutProps<"/tutor">) {
  await requireRole(["tutor"], ROUTES.tutorDashboard);

  return (
    <DashboardShell navItems={tutorNavItems} actions={<SignOutButton />}>
      {children}
    </DashboardShell>
  );
}
