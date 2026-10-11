"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";

import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { initialAuthFormState } from "@/lib/auth/action-state";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialAuthFormState,
  );

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FieldGroup>
        <AuthFormAlert state={state} />

        <Field data-invalid={Boolean(errors.password?.[0])}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            invalid={Boolean(errors.password?.[0])}
          />
          {errors.password?.[0] ? (
            <FieldError>{errors.password[0]}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(errors.confirmPassword?.[0])}>
          <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            invalid={Boolean(errors.confirmPassword?.[0])}
          />
          {errors.confirmPassword?.[0] ? (
            <FieldError>{errors.confirmPassword[0]}</FieldError>
          ) : null}
        </Field>

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving password
            </>
          ) : (
            "Set new password"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
