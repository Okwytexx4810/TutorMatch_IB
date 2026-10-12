"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  initialAuthFormState,
  type AuthFormState,
} from "@/lib/auth/action-state";

/** A request/booking Server Action, in the shape `useActionState` expects. */
export type EngagementAction = (
  state: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

/**
 * Schedule a session for an accepted request.
 *
 * Shared by the requester and tutor areas: the only difference is which Server
 * Action is passed in, so the markup and validation feedback stay identical.
 * The window is checked again server-side; the `datetime-local` inputs here are
 * only convenience.
 */
export function ScheduleBookingForm({
  requestId,
  action,
  submitLabel = "Schedule session",
  description,
}: {
  requestId: string;
  action: EngagementAction;
  submitLabel?: string;
  description?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialAuthFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <AuthFormAlert state={state} />

      <FieldGroup className="gap-3">
        <FieldDescription id={`slots-${requestId}-tz`}>
          Times are in West Africa Time (WAT, UTC+1).
        </FieldDescription>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.startsAt?.[0])}>
            <FieldLabel htmlFor={`startsAt-${requestId}`}>Starts</FieldLabel>
            <Input
              id={`startsAt-${requestId}`}
              name="startsAt"
              type="datetime-local"
              required
              aria-invalid={Boolean(errors.startsAt?.[0])}
            />
            {errors.startsAt?.[0] ? (
              <FieldError>{errors.startsAt[0]}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={Boolean(errors.endsAt?.[0])}>
            <FieldLabel htmlFor={`endsAt-${requestId}`}>Ends</FieldLabel>
            <Input
              id={`endsAt-${requestId}`}
              name="endsAt"
              type="datetime-local"
              required
              aria-invalid={Boolean(errors.endsAt?.[0])}
            />
            {errors.endsAt?.[0] ? (
              <FieldError>{errors.endsAt[0]}</FieldError>
            ) : null}
          </Field>
        </div>

        {description ? <FieldDescription>{description}</FieldDescription> : null}

        {errors.form?.[0] ? <FieldError>{errors.form[0]}</FieldError> : null}

        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CalendarPlus className="size-4" aria-hidden="true" />
          )}
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}