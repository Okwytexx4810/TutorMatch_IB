import Link from "next/link";

import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { ROUTES } from "@/lib/site-config";

/**
 * Reads the recovery session created by the auth callback, so the page must
 * never be served from a build-time snapshot. See the note on the dashboard
 * layout for why this is not automatic.
 */
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getUser();

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-muted-foreground">
          {user
            ? "Pick something memorable. At least 8 characters."
            : "Open this page from the link in your reset email."}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {!isSupabaseConfigured() ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            Authentication is not configured on this deployment yet.
          </p>
        ) : user ? (
          <ResetPasswordForm />
        ) : (
          // The emailed link has expired, or was already used. Recovery links are
          // single-use, so arriving here without a session is expected sometimes.
          <div className="grid gap-4 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
            <p className="text-sm font-medium">This link is no longer valid</p>
            <p className="text-sm text-muted-foreground">
              Reset links expire quickly and can only be used once. Request a
              fresh one and try again.
            </p>
            <Button asChild variant="outline" size="sm" className="mx-auto">
              <Link href={ROUTES.forgotPassword}>Request a new link</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
