import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  Inbox,
  MapPin,
  Search,
  Wallet,
} from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RequestStatusBadge } from "@/components/engagement/status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { greetingName } from "@/lib/auth/greeting";
import { getProfile, requireUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getRequesterBookings } from "@/lib/supabase/queries/bookings";
import { getRequesterRequests } from "@/lib/supabase/queries/requests";
import { formatDate, formatNaira } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track your tutor requests and upcoming bookings.",
};

export const dynamic = "force-dynamic";

function slotLabel(
  slots: { day: string; period: string }[],
): string | null {
  const slot = slots[0];
  return slot ? `${slot.day} ${slot.period}` : null;
}

export default async function DashboardPage() {
  const user = await requireUser(ROUTES.dashboard);
  const profile = await getProfile();

  const [requestsResult, bookingsResult] = await Promise.all([
    getRequesterRequests(user.id),
    getRequesterBookings(user.id),
  ]);

  const { requests, isError: requestsError } = requestsResult;
  const { bookings, isError: bookingsError } = bookingsResult;
  const isError = requestsError || bookingsError;

  const bookedRequestIds = new Set(
    bookings
      .map((booking) => booking.requestId)
      .filter((id): id is string => Boolean(id)),
  );

  const stats = [
    {
      label: "Pending requests",
      value: requests.filter((request) => request.status === "pending").length,
      icon: Inbox,
    },
    {
      label: "Accepted requests",
      value: requests.filter((request) => request.status === "accepted").length,
      icon: CalendarCheck,
    },
    {
      label: "Declined requests",
      value: requests.filter((request) => request.status === "declined").length,
      icon: Clock,
    },
  ] as const;

  const recentRequests = requests.slice(0, 4);

  return (
    <>
      <DashboardHeader
        title={`Hello, ${greetingName({
          fullName: profile?.full_name,
          email: user.email,
        })}`}
        description="Your tutor requests, bookings and upcoming sessions."
        actions={
          <Button asChild size="sm">
            <Link href={ROUTES.findTutors}>
              <Search className="size-4" aria-hidden="true" />
              Find a tutor
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 p-4 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-3">
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
                <CardDescription>{stat.label}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {isError ? (
          <ErrorState
            title="We could not load your requests"
            description="Please refresh the page to try again."
          />
        ) : recentRequests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Describe what you need and we will shortlist tutors who match your subject, location, availability and budget."
            action={
              <Button asChild size="sm">
                <Link href={ROUTES.findTutors}>Find a tutor</Link>
              </Button>
            }
          />
        ) : (
          <section className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold">Recent requests</h2>
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTES.dashboardRequests}>View all requests</Link>
              </Button>
            </div>

            <ul className="grid gap-4">
              {recentRequests.map((request) => {
                const tutorName =
                  request.tutor?.displayName ||
                  request.tutor?.headline ||
                  "Tutor";
                const slot = slotLabel(request.preferredSlots);

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
                            {tutorName} · requested{" "}
                            {formatDate(request.createdAt)}
                          </p>
                        </div>
                        <RequestStatusBadge status={request.status} />
                      </CardHeader>

                      <CardContent className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        {request.location ? (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-4" aria-hidden="true" />
                            {request.location}
                          </span>
                        ) : null}
                        {slot ? (
                          <span className="flex items-center gap-1.5 capitalize">
                            <Clock className="size-4" aria-hidden="true" />
                            {slot}
                          </span>
                        ) : null}
                        {typeof request.budget === "number" ? (
                          <span className="flex items-center gap-1.5">
                            <Wallet className="size-4" aria-hidden="true" />
                            {formatNaira(request.budget)} / hour
                          </span>
                        ) : null}
                        {bookedRequestIds.has(request.id) ? (
                          <span className="flex items-center gap-1.5 text-foreground">
                            <CalendarCheck
                              className="size-4"
                              aria-hidden="true"
                            />
                            Session booked
                          </span>
                        ) : null}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
