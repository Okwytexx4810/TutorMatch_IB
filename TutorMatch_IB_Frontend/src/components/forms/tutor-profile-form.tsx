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
import { IBADAN_LOCATIONS, resolveIbadanLocation } from "@/lib/locations";
import { SUBJECTS } from "@/lib/subjects";
import { tutorProfileLimits } from "@/lib/validation/tutor-profile";
import { EDUCATION_LEVELS, type EducationLevel } from "@/types/domain";

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
 * Scope: this form edits the `tutor_profiles` row plus the tutor's offerings in
 * `tutor_subjects` (subjects and levels). Qualifications and availability are
 * separate tables still managed in later milestones, so the meter below covers
 * basic details and must not be read as full search readiness — see
 * `deriveProfileCompleteness`.
 */

/** The subset of the stored row this form needs. Kept explicit to stay serialisable. */
export interface TutorProfileFormValues {
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string;
  hourly_rate: number;
  years_of_experience: number;
  is_verified: boolean;
  profile_completeness: number;
  subjects: string[];
  levels: EducationLevel[];
}

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const MULTI_SELECT_CLASS =
  "min-h-40 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

  // The saved location only preselects the dropdown when it is already one of
  // the approved areas. A legacy or free-text value (e.g. "Porthacourt") resolves
  // to null, so the tutor is asked to choose an approved location.
  const currentLocation = profile ? resolveIbadanLocation(profile.location) : null;

  // The stored value, which the server derives. Not a live count of what is in
  // the form: it refreshes on save, not on every keystroke.
  const completeness = isNew ? 50 : profile.profile_completeness;

  // The curated vocabulary plus any subject the tutor already has saved, so a
  // custom subject they picked earlier is never silently dropped from the list.
  const subjectOptions = Array.from(
    new Set<string>([...SUBJECTS, ...(profile?.subjects ?? [])]),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FieldGroup>
        <AuthFormAlert state={state} />

        {isNew ? (
          <FieldDescription className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm">
            You have not created a tutor profile yet. Add the details below to get
            started. Your subjects and levels are saved with your profile, and
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
            <Field data-invalid={Boolean(errors.displayName?.[0])}>
              <FieldLabel htmlFor="displayName">Display name</FieldLabel>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={profile?.display_name ?? ""}
                maxLength={tutorProfileLimits.displayName}
                placeholder="Mr. Adeyemi"
                aria-invalid={Boolean(errors.displayName?.[0])}
              />
              <FieldDescription>
                The name students see in search results. Optional — without it,
                your headline is shown instead.
              </FieldDescription>
              {errors.displayName?.[0] ? (
                <FieldError>{errors.displayName[0]}</FieldError>
              ) : null}
            </Field>

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
              <FieldLabel htmlFor="location">Teaching location</FieldLabel>
              <select
                id="location"
                name="location"
                required
                defaultValue={currentLocation ?? ""}
                aria-invalid={Boolean(errors.location?.[0])}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  Select your area
                </option>
                {IBADAN_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <FieldDescription>
                Choose the approved Ibadan area where you teach or meet students.
                {profile && currentLocation === null
                  ? " Your current saved location is not on the approved list — please choose one."
                  : ""}
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

        <Card>
          <CardHeader>
            <CardTitle>Subjects and levels you teach</CardTitle>
            <CardDescription>
              Students find you through these, so pick every subject and level
              you can help with.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Field data-invalid={Boolean(errors.subjects?.[0])}>
              <FieldLabel htmlFor="subjects">Subjects</FieldLabel>
              <select
                id="subjects"
                name="subjects"
                multiple
                size={10}
                defaultValue={profile?.subjects ?? []}
                aria-invalid={Boolean(errors.subjects?.[0])}
                className={MULTI_SELECT_CLASS}
              >
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              <FieldDescription>
                Hold Ctrl (or Cmd on a Mac) to choose more than one subject.
              </FieldDescription>
              {errors.subjects?.[0] ? (
                <FieldError>{errors.subjects[0]}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={Boolean(errors.levels?.[0])}>
              <FieldLabel htmlFor="levels">Levels</FieldLabel>
              <select
                id="levels"
                name="levels"
                multiple
                size={6}
                defaultValue={profile?.levels ?? []}
                aria-invalid={Boolean(errors.levels?.[0])}
                className={MULTI_SELECT_CLASS}
              >
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <FieldDescription>
                Hold Ctrl (or Cmd on a Mac) to choose more than one level.
              </FieldDescription>
              {errors.levels?.[0] ? (
                <FieldError>{errors.levels[0]}</FieldError>
              ) : null}
            </Field>
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
                This covers your basic details only. Your subjects and levels are
                saved alongside them and are what students search on.
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
