"use client";

import { BookOpen, GraduationCap, Loader2, Users } from "lucide-react";
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/app/(auth)/actions";
import { initialAuthFormState } from "@/lib/auth/action-state";
import { ROUTES } from "@/lib/site-config";

const accountTypes = [
  {
    value: "student",
    label: "Student",
    description: "I want help with my subjects",
    icon: GraduationCap,
  },
  {
    value: "parent",
    label: "Parent",
    description: "I am arranging tutoring for my child",
    icon: Users,
  },
  {
    value: "tutor",
    label: "Tutor",
    description: "I want to teach and get requests",
    icon: BookOpen,
  },
] as const;

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    initialAuthFormState,
  );

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FieldGroup>
        <AuthFormAlert state={state} />

        <Field data-invalid={Boolean(errors.fullName?.[0])}>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Adaeze Okonkwo"
            required
            aria-invalid={Boolean(errors.fullName?.[0])}
          />
          {errors.fullName?.[0] ? (
            <FieldError>{errors.fullName[0]}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(errors.email?.[0])}>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            aria-invalid={Boolean(errors.email?.[0])}
          />
          {errors.email?.[0] ? (
            <FieldError>{errors.email[0]}</FieldError>
          ) : null}
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Account type</FieldLegend>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {accountTypes.map((type) => (
              <label
                key={type.value}
                className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-3 transition-colors has-checked:border-brand-emerald/60 has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  name="role"
                  value={type.value}
                  defaultChecked={type.value === "student"}
                  className="sr-only"
                />
                <type.icon
                  className="size-4 text-brand-emerald-deep"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{type.label}</span>
                <span className="text-xs leading-snug text-muted-foreground">
                  {type.description}
                </span>
              </label>
            ))}
          </div>
          {errors.role?.[0] ? (
            <FieldError>{errors.role[0]}</FieldError>
          ) : (
            <FieldDescription>
              You can add a tutor profile later if you choose Tutor.
            </FieldDescription>
          )}
        </FieldSet>

        <Field data-invalid={Boolean(errors.password?.[0])}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
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
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
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
              Creating account
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <FieldDescription className="text-center">
          Already have an account?{" "}
          <Link
            href={ROUTES.login}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
