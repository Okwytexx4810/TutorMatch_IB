import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { ROUTES } from "@/lib/site-config";

/**
 * Auth chrome: a minimal, centred shell with no site navigation.
 *
 * Keeping the auth pages outside the marketing layout keeps them focused and
 * makes it unambiguous that the user is not browsing the marketplace. Page
 * width is owned by each page, because sign-up needs a different measure from
 * the single-column forms.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-surface">
      <div className="container-page flex h-16 shrink-0 items-center justify-between">
        <Logo />
        <Link
          href={ROUTES.home}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to site
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        {children}
      </main>

      <footer className="shrink-0 py-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link href={ROUTES.terms} className="underline-offset-4 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href={ROUTES.privacy} className="underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
}
