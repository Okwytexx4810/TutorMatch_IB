import { SignOutButton } from "@/components/forms/sign-out-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth/session";
import { adminNavItems } from "@/lib/navigation";
import { ROUTES } from "@/lib/site-config";

/**
 * Chrome for the admin area (`/admin`).
 *
 * Being signed in is not enough for this area. Only the sign-in requirement is
 * enforced here; real admin authorisation reads `profiles.role` under RLS in
 * Phase 4. Until that exists this area is intentionally empty, so a signed-in
 * tutor gains nothing by reaching it.
 *
 * `force-dynamic` keeps the guard from being frozen into a build-time snapshot.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireUser(ROUTES.admin);

  return (
    <DashboardShell navItems={adminNavItems} actions={<SignOutButton />}>
      {children}
    </DashboardShell>
  );
}
