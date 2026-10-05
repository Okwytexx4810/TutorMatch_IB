"use client";

import { BadgeCheck, Loader2, Sparkles } from "lucide-react";
import { useActionState } from "react";

import { saveTutorProfileAction } from "@/app/tutor/actions";
import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { initialAuthFormState } from "@/lib/auth/action-state";
import { tutorProfileLimits } from "@/lib/validation/tutor-profile";

/**
 * Tutor profile form.
 *
 * Uncontrolled inputs seeded with `defaultValue` from the stored profile. A
 * controlled form would need the profile mirrored into state and would be
 * rewritten on every keystroke; `defaultValue` also means the browser keeps
 * what the user typed across the `revalidatePath` refresh that follows a save,
 * instead of snapping back to a value captured on first render.
 *
 * `tutorProfileLimits` is imported rather than retyped so the `maxLength`
 * attributes and the Zod bounds cannot drift apart. That module holds no
 * server-only code, so importing it from a Client Component is safe.
 *
 * Scope: this form edits the `tutor_profiles` row only. Subjects, education
 * levels, qualifications and availability are separate tables managed in later
 * milestones, so the meter below covers basic details and must not be read as
 * search readiness — see `deriveProfileCompleteness`.
 */

/** The subset of the stored row this form needs. Kept explicit to stay serialisable. */
export interface TutorProfileFormValues {
  headline: string | null;
  bio: string | null;
  location: string;
  hourly_rate: number;
  years_of_experience: number;
  is_verified: boolean;
  profile_completeness: number;
}

export function TutorProfileForm({
  profile,
}: {
  /** `null` when the tutor has not created a profile yet. */
  profile: TutorProfileFormValues | null;
}) {
  const [state, formAction, isPending] = useActionState(
    saveTutorProfileAction,
    initialAuthFormState,
  );

  const errors = state.fieldErrors ?? {};
  const isNew = profile === null;

  // The stored value, which the server derives. Not a live count of what is in
  // the form: it refreshes on save, not on every keystroke.
  const completeness = isNew ? 50 : profile.profile_completeness;

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FieldGroup>
        <AuthFormAlert state={state} />

        {isNew ? (
          <FieldDescription className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm">
            You have not created a tutor profile yet. Add the details below to get
            started. You will add the subjects and levels you teach next, and
            students find tutors through those.
          </FieldDescription>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>How you present yourself</CardTitle>
            <CardDescription>
              This is what students see when they are choosing a tutor.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Field data-invalid={Boolean(errors.headline?.[0])}>
              <FieldLabel htmlFor="headline">Headline</FieldLabel>
              <Input
                id="headline"
                name="headline"
                defaultValue={profile?.headline ?? ""}
                maxLength={tutorProfileLimits.headline}
                placeholder="Mathematics and Further Mathematics tutor"
                aria-invalid={Boolean(errors.headline?.[0])}
              />
              <FieldDescription>
                One line on what and who you teach. Optional.
              </FieldDescription>
              {errors.headline?.[0] ? (
                <FieldError>{errors.headline[0]}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={Boolean(errors.bio?.[0])}>
              <FieldLabel htmlFor="bio">About you</FieldLabel>
              <Textarea
                id="bio"
                name="bio"
                rows={5}
                defaultValue={profile?.bio ?? ""}
                maxLength={tutorProfileLimits.bio}
                placeholder="Your teaching experience, the levels you cover, and how you run a lesson."
                aria-invalid={Boolean(errors.bio?.[0])}
              />
              <FieldDescription>
                Optional. Up to {tutorProfileLimits.bio.toLocaleString()} characters.
              </FieldDescription>
              {errors.bio?.[0] ? <FieldError>{errors.bio[0]}</FieldError> : null}
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practical details</CardTitle>
            <CardDescription>
              Used to match you with students nearby who can afford you.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Field data-invalid={Boolean(errors.location?.[0])}>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input
                id="location"
                name="location"
                defaultValue={profile?.location ?? ""}
                maxLength={tutorProfileLimits.location}
                placeholder="Lekki, Lagos"
                required
                aria-invalid={Boolean(errors.location?.[0])}
              />
              <FieldDescription>
                The area or town where you teach or meet students.
              </FieldDescription>
              {errors.location?.[0] ? (
                <FieldError>{errors.location[0]}</FieldError>
              ) : null}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.hourlyRate?.[0])}>
                <FieldLabel htmlFor="hourlyRate">Hourly rate (₦)</FieldLabel>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  defaultValue={profile?.hourly_rate ?? ""}
                  placeholder="5000"
                  required
                  aria-invalid={Boolean(errors.hourlyRate?.[0])}
                />
                <FieldDescription>Whole naira. No decimals.</FieldDescription>
                {errors.hourlyRate?.[0] ? (
                  <FieldError>{errors.hourlyRate[0]}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={Boolean(errors.yearsOfExperience?.[0])}>
                <FieldLabel htmlFor="yearsOfExperience">
                  Years of experience
                </FieldLabel>
                <Input
                  id="yearsOfExperience"
                  name="yearsOfExperience"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  defaultValue={profile?.years_of_experience ?? ""}
                  placeholder="3"
                  required
                  aria-invalid={Boolean(errors.yearsOfExperience?.[0])}
                />
                <FieldDescription>Enter 0 if you have not taught yet.</FieldDescription>
                {errors.yearsOfExperience?.[0] ? (
                  <FieldError>{errors.yearsOfExperience[0]}</FieldError>
                ) : null}
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Basic details complete</span>
            <span className="text-sm text-muted-foreground">
              {completeness}%
            </span>
          </div>
          <Progress
            value={completeness}
            aria-label="Basic tutor details completed"
          />
          <FieldDescription>
            {profile?.is_verified ? (
              <span className="inline-flex items-center gap-1 text-brand-emerald-deep">
                <BadgeCheck className="size-4" aria-hidden="true" />
                Verified by our team
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="size-4" aria-hidden="true" />
                This covers your basic details only. Subjects and levels are
                required for tutor discovery and will be added in the next step.
              </span>
            )}
          </FieldDescription>
        </div>

        {/* A schema-level parse failure, as opposed to a per-field one. */}
        {errors.form?.[0] ? (
          <FieldError>{errors.form[0]}</FieldError>
        ) : null}

        <Button type="submit" size="lg" className="h-11 w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving profile
            </>
          ) : isNew ? (
            "Create my profile"
          ) : (
            "Save changes"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
