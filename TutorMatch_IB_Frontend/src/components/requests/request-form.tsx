"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";

import { sendTutorRequestAction } from "@/app/(marketing)/tutors/[id]/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { initialAuthFormState } from "@/lib/auth/action-state";
import { IBADAN_LOCATIONS } from "@/lib/locations";
import {
  REQUEST_BUDGET_MAX,
  REQUEST_MESSAGE_MAX,
} from "@/lib/validation/engagement";
import { DAY_PERIODS, WEEK_DAYS } from "@/types/domain";

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Send-request form on a tutor's public profile.
 *
 * Only rendered for signed-in visitors (the page swaps in a sign-in prompt
 * otherwise), and only when the tutor has listed at least one subject and
 * level — see the guard below. The subject/level selects are populated from
 * that tutor's real offerings, so the form cannot offer a combination the
 * server will reject.
 */
export function RequestForm({
  tutorId,
  tutorName,
  subjects,
  levels,
  defaultLocation,
}: {
  tutorId: string;
  tutorName: string;
  /** Distinct subjects the tutor listed in `tutor_subjects`. */
  subjects: string[];
  /** Distinct levels the tutor teaches. */
  levels: string[];
  /** The requester's own approved location, offered as the default. */
  defaultLocation: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    sendTutorRequestAction,
    initialAuthFormState,
  );
  const errors = state.fieldErrors ?? {};

  if (subjects.length === 0 || levels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {tutorName} has not listed the subjects and levels they teach yet, so
        requests cannot be sent to them right now.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <input type="hidden" name="tutorId" value={tutorId} />
      <AuthFormAlert state={state} />

      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.subject?.[0])}>
            <FieldLabel htmlFor="request-subject">Subject</FieldLabel>
            <select
              id="request-subject"
              name="subject"
              required
              defaultValue=""
              aria-invalid={Boolean(errors.subject?.[0])}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Choose a subject
              </option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            {errors.subject?.[0] ? (
              <FieldError>{errors.subject[0]}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={Boolean(errors.level?.[0])}>
            <FieldLabel htmlFor="request-level">Level</FieldLabel>
            <select
              id="request-level"
              name="level"
              required
              defaultValue=""
              aria-invalid={Boolean(errors.level?.[0])}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Choose a level
              </option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            {errors.level?.[0] ? (
              <FieldError>{errors.level[0]}</FieldError>
            ) : null}
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.location?.[0])}>
          <FieldLabel htmlFor="request-location">Preferred area</FieldLabel>
          <select
            id="request-location"
            name="location"
            required
            defaultValue={defaultLocation ?? ""}
            aria-invalid={Boolean(errors.location?.[0])}
            className={SELECT_CLASS}
          >
            <option value="" disabled>
              Select an area
            </option>
            {IBADAN_LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          <FieldDescription>
            Where you would like to meet, from the approved Ibadan areas.
          </FieldDescription>
          {errors.location?.[0] ? (
            <FieldError>{errors.location[0]}</FieldError>
          ) : null}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.day?.[0])}>
            <FieldLabel htmlFor="request-day">Preferred day</FieldLabel>
            <select
              id="request-day"
              name="day"
              required
              defaultValue=""
              aria-invalid={Boolean(errors.day?.[0])}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Choose a day
              </option>
              {WEEK_DAYS.map((day) => (
                <option key={day} value={day} className="capitalize">
                  {day}
                </option>
              ))}
            </select>
            {errors.day?.[0] ? <FieldError>{errors.day[0]}</FieldError> : null}
          </Field>

          <Field data-invalid={Boolean(errors.period?.[0])}>
            <FieldLabel htmlFor="request-period">Preferred time</FieldLabel>
            <select
              id="request-period"
              name="period"
              required
              defaultValue=""
              aria-invalid={Boolean(errors.period?.[0])}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Choose a time
              </option>
              {DAY_PERIODS.map((period) => (
                <option key={period} value={period} className="capitalize">
                  {period}
                </option>
              ))}
            </select>
            {errors.period?.[0] ? (
              <FieldError>{errors.period[0]}</FieldError>
            ) : null}
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.budget?.[0])}>
          <FieldLabel htmlFor="request-budget">Budget per hour (₦)</FieldLabel>
          <Input
            id="request-budget"
            name="budget"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            max={REQUEST_BUDGET_MAX}
            placeholder="Optional"
            aria-invalid={Boolean(errors.budget?.[0])}
          />
          <FieldDescription>
            Optional. Whole naira per hour; leave blank if you are unsure.
          </FieldDescription>
          {errors.budget?.[0] ? (
            <FieldError>{errors.budget[0]}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={Boolean(errors.message?.[0])}>
          <FieldLabel htmlFor="request-message">Message</FieldLabel>
          <Textarea
            id="request-message"
            name="message"
            rows={4}
            maxLength={REQUEST_MESSAGE_MAX}
            placeholder="Tell the tutor what you need help with."
            aria-invalid={Boolean(errors.message?.[0])}
          />
          <FieldDescription>
            Optional. Up to {REQUEST_MESSAGE_MAX.toLocaleString()} characters.
          </FieldDescription>
          {errors.message?.[0] ? (
            <FieldError>{errors.message[0]}</FieldError>
          ) : null}
        </Field>

        {errors.form?.[0] ? <FieldError>{errors.form[0]}</FieldError> : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sending request
            </>
          ) : (
            <>
              <Send className="size-4" aria-hidden="true" />
              Send request
            </>
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}