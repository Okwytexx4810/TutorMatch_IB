import { SignOutButton } from "@/components/forms/sign-out-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth/session";
import { tutorNavItems } from "@/lib/navigation";
import { ROUTES } from "@/lib/site-config";

/**
 * Chrome for the tutor area (`/tutor/*`).
 *
 * Only the sign-in requirement is enforced here. A real tutor-only check needs
 * `profiles.role` and RLS, which arrive in Phase 4; until then `user_metadata`
 * is deliberately not consulted for authorisation.
 *
 * `force-dynamic` keeps the guard from being frozen into a build-time snapshot.
 */
export const dynamic = "force-dynamic";

export default async function TutorLayout({ children }: LayoutProps<"/tutor">) {
  await requireUser(ROUTES.tutorDashboard);

  return (
    <DashboardShell navItems={tutorNavItems} actions={<SignOutButton />}>
      {children}
    </DashboardShell>
  );
}
