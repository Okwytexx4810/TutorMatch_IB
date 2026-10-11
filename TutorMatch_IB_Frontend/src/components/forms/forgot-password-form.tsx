"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { initialAuthFormState } from "@/lib/auth/action-state";
import { ROUTES } from "@/lib/site-config";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialAuthFormState,
  );

  const emailError = state.fieldErrors?.email?.[0];

  // The confirmation is intentionally shown whether or not the address exists.
  if (state.status === "success") {
    return (
      <div className="grid gap-6">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-brand-emerald/30 bg-accent/50 p-6 text-center">
          <MailCheck className="size-8 text-brand-emerald-deep" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{state.message}</p>
        </div>
        <Button asChild variant="outline" className="h-11 w-full">
          <Link href={ROUTES.login}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FieldGroup>
        <AuthFormAlert state={state} />

        <Field data-invalid={Boolean(emailError)}>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            aria-invalid={Boolean(emailError)}
          />
          {emailError ? <FieldError>{emailError}</FieldError> : null}
        </Field>

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sending link
            </>
          ) : (
            "Send reset link"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Link
            href={ROUTES.login}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
