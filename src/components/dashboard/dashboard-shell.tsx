import type { Route } from "next";

import {
  DashboardSidebar,
  type NavItem,
} from "@/components/dashboard/dashboard-sidebar";

/**
 * The dashboard chrome shared by `/dashboard`, `/tutor/*` and `/admin`.
 *
 * The sidebar definition comes from the layout, while the header is supplied by
 * each page so the title and actions can depend on real data. Keeping both in
 * one place stops the three areas from drifting apart visually.
 *
 * `actions` holds area-wide controls that belong to the shell rather than to a
 * single page, currently the sign-out button in all three areas.
 */
export function DashboardShell({
  navItems,
  activeHref,
  header,
  actions,
  children,
}: {
  navItems: readonly NavItem[];
  activeHref?: Route;
  header?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full bg-background">
      <DashboardSidebar items={navItems} activeHref={activeHref} />
      <div className="flex min-w-0 flex-1 flex-col">
        {header}
        {actions ? (
          <div className="flex justify-end border-b border-border px-4 py-2 sm:px-6">
            {actions}
          </div>
        ) : null}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
