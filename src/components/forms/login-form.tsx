"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/app/(auth)/actions";
import { initialAuthFormState, type AuthFormState } from "@/lib/auth/action-state";
import { ROUTES } from "@/lib/site-config";

export function LoginForm({
  next,
  initialError,
}: {
  /** Sanitised redirect target carried over from the URL. */
  next?: string;
  /** Set when the auth callback sent the visitor back with a failure. */
  initialError?: string;
}) {
  const initialState: AuthFormState = initialError
    ? { status: "error", message: initialError }
    : initialAuthFormState;

  const [state, formAction, isPending] = useActionState(
    signInAction,
    initialState,
  );

  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

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
            aria-describedby={emailError ? "email-error" : undefined}
          />
          {emailError ? (
            <FieldError id="email-error">{emailError}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(passwordError)}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href={ROUTES.forgotPassword}
              className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            invalid={Boolean(passwordError)}
          />
          {passwordError ? (
            <FieldError id="password-error">{passwordError}</FieldError>
          ) : null}
        </Field>

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Signing in
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <FieldDescription className="text-center">
          New to TutorMatch IB?{" "}
          <Link
            href={ROUTES.register}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
