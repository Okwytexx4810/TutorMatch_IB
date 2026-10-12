import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Inbox,
  MapPin,
  Sparkles,
  UserPlus,
  UserRound,
  Wallet,
} from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RequestStatusBadge } from "@/components/engagement/status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { RespondToRequestButtons } from "@/components/requests/respond-to-request-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { greetingName } from "@/lib/auth/greeting";
import { requireRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getTutorBookings } from "@/lib/supabase/queries/bookings";
import { getTutorRequests } from "@/lib/supabase/queries/requests";
import { getCurrentTutorProfile } from "@/lib/supabase/queries/tutor-profile";
import { formatDate, formatNaira, formatTime } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Tutor dashboard",
  description: "Incoming requests, upcoming sessions and your availability.",
};

export const dynamic = "force-dynamic";

export default async function TutorDashboardPage() {
  const { user, profile } = await requireRole(["tutor"], ROUTES.tutorDashboard);
  const tutorProfile = await getCurrentTutorProfile();

  const displayName = greetingName({
    fullName: profile.full_name,
    displayName: tutorProfile?.display_name,
    email: user.email,
  });

  if (!tutorProfile) {
    return (
      <>
        <DashboardHeader
          title={`Hello, ${displayName}`}
          description="Let's get your tutor profile ready so students can find and book you."
        />
        <div className="p-4 sm:p-6">
          <EmptyState
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            title="Create your tutor profile"
            description="Add your subjects, levels, area and rate. Your profile is what students see, and it has to exist before they can send you a request."
            action={
              <Button asChild size="sm">
                <Link href={ROUTES.tutorProfileSettings}>
                  Create my profile
                </Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const [requestsResult, bookingsResult] = await Promise.all([
    getTutorRequests(tutorProfile.id),
    getTutorBookings(tutorProfile.id),
  ]);

  const { requests, isError: requestsError } = requestsResult;
  const { bookings } = bookingsResult;

  const now = new Date().getTime();
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const upcomingSessions = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.startsAt).getTime() >= now,
  );
  const nextSession = upcomingSessions
    .slice()
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )[0];

  const stats = [
    {
      label: "Pending requests",
      value: pendingRequests.length,
      icon: Inbox,
      href: ROUTES.tutorRequests,
    },
    {
      label: "Upcoming sessions",
      value: upcomingSessions.length,
      icon: CalendarDays,
      href: ROUTES.tutorBookings,
    },
  ] as const;

  return (
    <>
      <DashboardHeader
        title={`Hello, ${displayName}`}
        description="Here is what is happening with your tutoring."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={ROUTES.tutorProfileSettings}>
              <UserRound className="size-4" aria-hidden="true" />
              Edit profile
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 p-4 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <span
                  className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                  aria-hidden="true"
                >
                  <stat.icon className="size-4" />
                </span>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {stat.value}
                </CardTitle>
                <CardDescription>
                  <Link
                    href={stat.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {stat.label}
                  </Link>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Incoming requests</h2>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.tutorRequests}>View all requests</Link>
            </Button>
          </div>

          {requestsError ? (
            <ErrorState
              title="We could not load your requests"
              description="Please refresh the page to try again."
            />
          ) : pendingRequests.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-5" aria-hidden="true" />}
              title="No pending requests"
              description="New student requests appear here so you can accept or decline them."
            />
          ) : (
            <ul className="grid gap-4">
              {pendingRequests.map((request) => {
                const slot = request.preferredSlots[0];

                return (
                  <li key={request.id}>
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="min-w-0">
                          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                            {request.subject}
                            {request.level ? (
                              <Badge variant="secondary">{request.level}</Badge>
                            ) : null}
                          </CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Received {formatDate(request.createdAt)}
                          </p>
                        </div>
                        <RequestStatusBadge status={request.status} />
                      </CardHeader>

                      <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          {request.location ? (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="size-4" aria-hidden="true" />
                              {request.location}
                            </span>
                          ) : null}
                          {slot ? (
                            <span className="flex items-center gap-1.5 capitalize">
                              <Clock className="size-4" aria-hidden="true" />
                              {slot.day} {slot.period}
                            </span>
                          ) : null}
                          {typeof request.budget === "number" ? (
                            <span className="flex items-center gap-1.5">
                              <Wallet className="size-4" aria-hidden="true" />
                              Budget {formatNaira(request.budget)} / hour
                            </span>
                          ) : null}
                        </div>

                        {request.message ? (
                          <p className="whitespace-pre-line text-foreground">
                            {request.message}
                          </p>
                        ) : null}

                        <RespondToRequestButtons requestId={request.id} />
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" aria-hidden="true" />
              Profile completeness
            </CardTitle>
            <CardDescription>
              {tutorProfile.profile_completeness}% complete. A fuller profile
              matches better with students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={tutorProfile.profile_completeness}
              aria-label="Tutor profile completeness"
            />
          </CardContent>
        </Card>

        {nextSession ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next session</CardTitle>
              <CardDescription>
                {nextSession.subject} · {formatDate(nextSession.startsAt)} ·{" "}
                {formatTime(nextSession.startsAt)}–
                {formatTime(nextSession.endsAt)}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <EmptyState
            icon={<Inbox className="size-5" aria-hidden="true" />}
            title="Nothing scheduled yet"
            description="Incoming requests and upcoming sessions will appear here as students reach out."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTES.tutorRequests}>View requests</Link>
              </Button>
            }
          />
        )}
      </div>
    </>
  );
}
