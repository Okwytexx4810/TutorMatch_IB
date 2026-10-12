import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Clock,
  GraduationCap,
  MapPin,
  Star,
  UserRound,
} from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestForm } from "@/components/requests/request-form";
import { getProfile, getUser } from "@/lib/auth/session";
import { resolveIbadanLocation } from "@/lib/locations";
import { ROUTES } from "@/lib/site-config";
import { getTutorProfileById } from "@/lib/supabase/queries/tutor-detail";
import { formatNaira } from "@/lib/utils/format";
import type { WeekDay } from "@/types/domain";
import { WEEK_DAYS } from "@/types/domain";
import type { TutorProfile } from "@/types/tutor";

export const metadata: Metadata = {
  title: "Tutor profile",
  description:
    "Full tutor profile: bio, subjects, qualifications, rates, availability and reviews.",
};

/** Public tutor profile route: reads one tutor id through RLS. */
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function initialsOf(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function AvailabilityGrid({ tutor }: { tutor: TutorProfile }) {
  const slotsByDay = new Map<WeekDay, string[]>();
  for (const day of WEEK_DAYS) {
    const lines = tutor.availability
      .filter((slot) => slot.day === day && slot.isActive)
      .map((slot) =>
        slot.startTime ? `${slot.period} · ${slot.startTime}` : slot.period,
      );
    if (lines.length > 0) slotsByDay.set(day, lines);
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {WEEK_DAYS.map((day) => {
        const lines = slotsByDay.get(day);
        return (
          <div
            key={day}
            className="rounded-lg border bg-card px-4 py-3 text-sm"
          >
            <p className="font-medium capitalize text-foreground">{day}</p>
            {lines && lines.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {lines.map((line) => (
                  <li key={line}>
                    {" "}
                    <span className="capitalize">{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">Not available</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function TutorProfilePage({
  params,
}: PageProps<"/tutors/[id]">) {
  const { id } = await params;

  // Malformed ids would reach PostgREST as an invalid uuid cast (PGRST116 catches
  // nothing here, Postgres raises 22P02). Short-circuit to not-found instead.
  if (!UUID_PATTERN.test(id)) {
    return <NotFoundTutor />;
  }

  const result = await getTutorProfileById(id);
  const user = await getUser();
  const profile = await getProfile();

  if (result.isError) {
    return (
      <div className="container-page py-10">
        <div className="space-y-4">
          <ErrorState
            title="We could not load this profile"
            description="Please try again in a moment."
          />
          <Button asChild variant="outline">
            <Link href={ROUTES.findTutors}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to search
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!result.tutor) {
    return <NotFoundTutor />;
  }

  const tutor = result.tutor;
  const displayName = tutor.fullName || tutor.headline || "Tutor";
  const rating = tutor.averageRating;
  const requesterLocation = resolveIbadanLocation(profile?.location);
  const signInHref =
    `${ROUTES.login}?next=${encodeURIComponent(ROUTES.tutorProfile(tutor.id))}` as Route;

  return (
    <div className="container-page py-10">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href={ROUTES.findTutors}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to search
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar size="lg" className="size-16">
                <AvatarFallback className="bg-brand-navy-deep text-primary-foreground">
                  {tutor.fullName ? (
                    initialsOf(tutor.fullName)
                  ) : (
                    <UserRound className="size-6" aria-hidden="true" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-1.5 text-2xl">
                  {displayName}
                  {tutor.isVerified ? (
                    <span
                      className="inline-flex items-center"
                      title="Verified tutor"
                    >
                      <BadgeCheck
                        className="size-5 shrink-0 text-brand-emerald-deep"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Verified tutor</span>
                    </span>
                  ) : null}
                </CardTitle>
                {tutor.headline ? (
                  <p className="mt-1 text-muted-foreground">{tutor.headline}</p>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Star
                  className="size-4 shrink-0 text-brand-emerald-deep"
                  aria-hidden="true"
                />
                {rating ? (
                  <>
                    <span className="font-medium text-foreground">
                      {rating.toFixed(1)}
                    </span>
                    <span>({tutor.reviewCount} reviews)</span>
                  </>
                ) : (
                  <span>No reviews yet</span>
                )}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                {tutor.location}
              </p>
              <p className="flex items-center gap-2">
                <BriefcaseBusiness className="size-4 shrink-0" aria-hidden="true" />
                {tutor.yearsOfExperience} years of experience
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {formatNaira(tutor.hourlyRate)}
                </span>
                <span>per hour</span>
              </p>
            </CardContent>
          </Card>

          {tutor.bio ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tutor.bio}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              {tutor.subjects.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {tutor.subjects.map((subject) => (
                    <li key={subject}>
                      <Badge variant="secondary">{subject}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No subjects shared yet.
                </p>
              )}
            </CardContent>
          </Card>

          {tutor.educationLevels.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="size-5" aria-hidden="true" />
                  Levels taught
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  {tutor.educationLevels.map((level) => (
                    <li key={level}>
                      <Badge>{level}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {tutor.qualifications.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Qualifications</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-4">
                  {tutor.qualifications.map((qualification) => (
                    <li key={qualification.id} className="flex gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {qualification.title}
                        </p>
                        {qualification.institution ? (
                          <p className="text-sm text-muted-foreground">
                            {qualification.institution}
                          </p>
                        ) : null}
                      </div>
                      {qualification.year ? (
                        <p className="text-sm font-medium text-muted-foreground">
                          {qualification.year}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="size-5" aria-hidden="true" />
                Weekly availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tutor.availability.filter((slot) => slot.isActive).length > 0 ? (
                <AvailabilityGrid tutor={tutor} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  This tutor has not shared their weekly availability yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request this tutor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user ? (
                <RequestForm
                  tutorId={tutor.id}
                  tutorName={displayName}
                  subjects={tutor.subjects}
                  levels={tutor.educationLevels}
                  defaultLocation={requesterLocation}
                />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Sign in to send {displayName} a request with your subject,
                    preferred time and budget.
                  </p>
                  <Button asChild className="w-full">
                    <Link href={signInHref}>Sign in to request</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function NotFoundTutor() {
  return (
    <div className="container-page py-10">
      <EmptyState
        icon={<UserRound className="size-5" aria-hidden="true" />}
        title="Profile not found"
        description="This tutor profile does not exist or is no longer available."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={ROUTES.findTutors}>Browse all tutors</Link>
          </Button>
        }
      />
    </div>
  );
}