"use client";

import { CircleAlert, CircleCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AuthFormState } from "@/lib/auth/action-state";

/**
 * Renders an authentication action's result inline, above the submit button.
 *
 * Server Actions return text written by this codebase, never a Supabase error
 * object, so displaying `state.message` cannot leak internals.
 */
export function AuthFormAlert({ state }: { state: AuthFormState }) {
  if (state.status === "idle" || !state.message) return null;

  const isError = state.status === "error";
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <Alert
      variant={isError ? "destructive" : "default"}
      className={isError ? undefined : "border-brand-emerald/40 bg-accent/50"}
    >
      <Icon aria-hidden="true" />
      <AlertTitle>{isError ? "Something to fix" : "Done"}</AlertTitle>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
