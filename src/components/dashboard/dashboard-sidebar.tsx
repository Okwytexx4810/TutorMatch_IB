import type { Route } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

export interface NavItem {
  /** Typed as `Route` so `next/link` validates it at compile time. */
  href: Route;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Shown as a small count bubble, e.g. number of pending requests. */
  badge?: number;
}

/**
 * Sidebar navigation for the student/parent, tutor and admin areas.
 *
 * A Server Component in this phase. It becomes interactive (collapse, mobile
 * drawer) in Phase 10 once real navigation state exists.
 */
export function DashboardSidebar({
  items,
  activeHref,
  footer,
}: {
  items: readonly NavItem[];
  activeHref?: Route;
  footer?: React.ReactNode;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo className="text-sidebar-foreground" />
      </div>

      <nav aria-label="Dashboard" className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const isActive =
            activeHref === item.href ||
            (activeHref ? activeHref.startsWith(`${item.href}/`) : false);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {footer ? <div className="border-t border-sidebar-border p-4">{footer}</div> : null}
    </aside>
  );
}
