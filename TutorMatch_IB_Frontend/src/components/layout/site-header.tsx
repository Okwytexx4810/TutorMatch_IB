import Link from "next/link";
import type { Route } from "next";

import { AccountMenu } from "@/components/layout/account-menu";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/session";
import { publicNavLinks, ROUTES } from "@/lib/site-config";

/**
 * The profile route that belongs to a given role, so the avatar in the header
 * always opens the right place instead of bouncing to sign-in.
 */
function profileHrefForRole(role: string | null | undefined): Route {
  if (role === "tutor") return ROUTES.tutorProfileSettings;
  if (role === "admin") return ROUTES.admin;
  return ROUTES.dashboardProfile;
}

/**
 * Public site header.
 *
 * A Server Component. It reads the session so a signed-in visitor sees their
 * own account (avatar linking to their profile, plus sign out) rather than the
 * Log in / Get started buttons. The only client code is `MobileNav`, a single
 * isolated drawer, and the `AccountMenu`'s sign-out form.
 */
export async function SiteHeader() {
  const profile = await getProfile();
  const name = profile?.full_name?.trim() || profile?.email || "Account";
  const account = profile
    ? { name, profileHref: profileHrefForRole(profile.role) }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav
          aria-label="Main"
          className="hidden items-center gap-7 md:flex lg:gap-8"
        >
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {account ? (
            <div className="hidden md:block">
              <AccountMenu name={account.name} profileHref={account.profileHref} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href={ROUTES.login}>Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={ROUTES.register}>Get started</Link>
              </Button>
            </div>
          )}
          <MobileNav account={account} />
        </div>
      </div>
    </header>
  );
}
