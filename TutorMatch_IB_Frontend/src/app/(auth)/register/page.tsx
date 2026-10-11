import { RegisterForm } from "@/components/forms/register-form";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { ROUTES } from "@/lib/site-config";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-2 text-muted-foreground">
          Join TutorMatch IB to find or offer expert tutoring.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {isSupabaseConfigured() ? (
          <RegisterForm />
        ) : (
          <div className="grid gap-4 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
            <p className="text-sm font-medium">Registration is not configured</p>
            <p className="text-sm text-muted-foreground">
              Set{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and{" "}
              <code className="font-mono text-xs">
                NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              </code>{" "}
              in <code className="font-mono text-xs">.env.local</code> to enable
              sign up.
            </p>
            <Button asChild variant="outline" size="sm" className="mx-auto">
              <a href={ROUTES.login}>Back to sign in</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
