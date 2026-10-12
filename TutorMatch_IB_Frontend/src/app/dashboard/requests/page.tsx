import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Clock, MapPin, Wallet } from "lucide-react";

import { ScheduleBookingForm } from "@/components/bookings/schedule-booking-form";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RequestStatusBadge } from "@/components/engagement/status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { CancelRequestButton } from "@/components/requests/cancel-request-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { scheduleRequesterBookingAction } from "@/app/dashboard/actions";
import { requireUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getRequesterBookings } from "@/lib/supabase/queries/bookings";
import { getRequesterRequests } from "@/lib/supabase/queries/requests";
import { formatDate, formatNaira } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "My requests",
  description: "Track the status of tutor requests you have sent.",
};

export const dynamic = "force-dynamic";

function slotLabel(
  slots: { day: string; period: string }[],
): string | null {
  const slot = slots[0];
  return slot ? `${slot.day} ${slot.period}` : null;
}

export default async function DashboardRequestsPage() {
  const user = await requireUser(ROUTES.dashboardRequests);

  const [requestsResult, bookingsResult] = await Promise.all([
    getRequesterRequests(user.id),
    getRequesterBookings(user.id),
  ]);

  // A request id that already has a booking row (in any state) cannot produce a
  // second one: `bookings.request_id` is unique, and a cancelled booking keeps
  // the row. So scheduling is offered only until the first booking exists.
  const bookedRequestIds = new Set(
    bookingsResult.bookings
      .map((booking) => booking.requestId)
      .filter((id): id is string => Boolean(id)),
  );

  const { requests, isError } = requestsResult;

  return (
    <>
      <DashboardHeader
        title="My requests"
        description="Track every request from pending through to booking."
      />

      <div className="p-4 sm:p-6">
        {isError ? (
          <ErrorState
            title="We could not load your requests"
            description="Please refresh the page to try again."
          />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Clock className="size-5" aria-hidden="true" />}
            title="You have not sent any requests"
            description="Find a tutor, open their profile and send a request with your subject, preferred time and budget."
            action={
              <Button asChild size="sm">
                <Link href={ROUTES.dashboardFindTutor}>Find a tutor</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4">
            {requests.map((request) => {
              const hasBooking = bookedRequestIds.has(request.id);
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
                          {tutorName} · requested {formatDate(request.createdAt)}
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
                            {slot}
                          </span>
                        ) : null}
                        {typeof request.budget === "number" ? (
                          <span className="flex items-center gap-1.5">
                            <Wallet className="size-4" aria-hidden="true" />
                            {formatNaira(request.budget)} / hour
                          </span>
                        ) : null}
                      </div>

                      {request.message ? (
                        <p className="whitespace-pre-line text-foreground">
                          {request.message}
                        </p>
                      ) : null}

                      {request.status === "pending" ? (
                        <CancelRequestButton requestId={request.id} />
                      ) : null}

                      {request.status === "accepted" && !hasBooking ? (
                        <ScheduleBookingForm
                          requestId={request.id}
                          action={scheduleRequesterBookingAction}
                          description="Agree a time with the tutor and book the session."
                        />
                      ) : null}

                      {request.status === "accepted" && hasBooking ? (
                        <p className="flex items-center gap-1.5 text-foreground">
                          <CalendarCheck className="size-4" aria-hidden="true" />
                          A session is booked for this request. See{" "}
                          <Link
                            href={ROUTES.dashboardBookings}
                            className="underline underline-offset-4"
                          >
                            My sessions
                          </Link>
                          .
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}