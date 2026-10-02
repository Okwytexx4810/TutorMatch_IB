import Link from "next/link";

import { Logo } from "@/components/layout/logo";

/**
 * Auth chrome: a minimal, centred shell with no site navigation.
 *
 * Keeping the auth pages outside the marketing layout keeps them focused and
 * makes it unambiguous that the user is not browsing the marketplace.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-surface">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to site
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
