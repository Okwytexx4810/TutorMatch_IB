import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { getRole, getUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/site-config";

/** Errors the auth callback can hand back via the query string. */
const CALLBACK_ERRORS: Record<string, string> = {
  expired: "That sign-in link has expired. Please request a new one.",
  missing_code: "That sign-in link is incomplete. Please request a new one.",
  unconfigured: "Authentication is not configured on this deployment yet.",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const next = typeof params.next === "string" ? params.next : undefined;

  // The Proxy already redirects signed-in users, but a cached page can still be
  // rendered directly, so the page re-checks before rendering a login form.
  const user = await getUser();
  // Routing follows the database role, never the metadata claim.
  if (user) redirect(homeForRole(await getRole()));

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to manage your lessons and requests.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {isSupabaseConfigured() ? (
          <LoginForm next={next} initialError={CALLBACK_ERRORS[errorKey]} />
        ) : (
          <div className="grid gap-4 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
            <p className="text-sm font-medium">Authentication is not configured</p>
            <p className="text-sm text-muted-foreground">
              Set <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and{" "}
              <code className="font-mono text-xs">
                NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              </code>{" "}
              in <code className="font-mono text-xs">.env.local</code> to enable
              sign in.
            </p>
            <Button asChild variant="outline" size="sm" className="mx-auto">
              <a href={ROUTES.register}>Create an account</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
