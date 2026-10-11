import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your email address and we will send you a secure reset link.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {isSupabaseConfigured() ? (
          <ForgotPasswordForm />
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            Authentication is not configured on this deployment yet.
          </p>
        )}
      </div>
    </div>
  );
}
