import { SignOutButton } from "@/components/forms/sign-out-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { adminNavItems } from "@/lib/navigation";
import { ROUTES } from "@/lib/site-config";

/**
 * Chrome for the admin area (`/admin`).
 *
 * Admin-only. The check reads the trusted `profiles.role` from the database, not
 * `user_metadata`, and `admin` is refused by the `handle_new_user()` trigger, so
 * an account cannot reach this area by claiming the role at registration. A tutor
 * is redirected to their own dashboard.
 *
 * `force-dynamic` keeps the guard from being frozen into a build-time snapshot.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole(["admin"], ROUTES.admin);

  return (
    <DashboardShell navItems={adminNavItems} actions={<SignOutButton />}>
      {children}
    </DashboardShell>
  );
}
