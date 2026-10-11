import { SignOutButton } from "@/components/forms/sign-out-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth/session";
import { studentNavItems } from "@/lib/navigation";
import { ROUTES } from "@/lib/site-config";

/**
 * Chrome for the student/parent area (`/dashboard/*`).
 *
 * The Proxy already redirects anonymous visitors, but the guard is repeated here
 * on purpose: a layout that renders data must be able to prove the session for
 * itself, independent of any matcher configuration.
 *
 * `force-dynamic` is required, not decorative. `getUser()` short-circuits before
 * reading cookies when Supabase is unconfigured, so without it Next prerenders
 * whatever the guard decided at build time and serves that decision to every
 * later visitor.
 */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  await requireUser(ROUTES.dashboard);

  return (
    <DashboardShell navItems={studentNavItems} actions={<SignOutButton />}>
      {children}
    </DashboardShell>
  );
}
