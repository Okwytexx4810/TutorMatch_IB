import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { publicNavLinks, ROUTES } from "@/lib/site-config";

/**
 * Public site header.
 *
 * Deliberately a Server Component: it has no interactive state. Authentication
 * state is injected later as a slot once Supabase Auth exists (Phase 3).
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.login}>Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={ROUTES.register}>Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
