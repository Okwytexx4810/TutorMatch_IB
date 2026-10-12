import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CalendarX, Wallet } from "lucide-react";

import { cancelRequesterBookingAction } from "@/app/dashboard/actions";
import {
  BookingActions,
  type BookingActionIntent,
} from "@/components/bookings/booking-actions";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BookingStatusBadge } from "@/components/engagement/status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getRequesterBookings } from "@/lib/supabase/queries/bookings";
import { formatDate, formatNaira, formatTime } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "My sessions",
  description: "Your confirmed and past tutoring sessions.",
};

export const dynamic = "force-dynamic";

const REQUESTER_INTENTS: BookingActionIntent[] = [
  { intent: "cancel", label: "Cancel session", variant: "outline", icon: "x" },
];

export default async function DashboardBookingsPage() {
  const user = await requireUser(ROUTES.dashboardBookings);
  const { bookings, isError } = await getRequesterBookings(user.id);

  return (
    <>
      <DashboardHeader
        title="My sessions"
        description="Sessions booked from your accepted requests."
      />

      <div className="p-4 sm:p-6">
        {isError ? (
          <ErrorState
            title="We could not load your sessions"
            description="Please refresh the page to try again."
          />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="size-5" aria-hidden="true" />}
            title="No sessions yet"
            description="Once a request is accepted and a time is agreed, the session appears here."
            action={
              <Button asChild size="sm">
                <Link href={ROUTES.dashboardRequests}>View my requests</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4">
            {bookings.map((booking) => {
              const tutorName =
                booking.tutor?.displayName ||
                booking.tutor?.headline ||
                "Tutor";

              return (
                <li key={booking.id}>
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          {booking.subject}
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {tutorName}
                        </p>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="size-4" aria-hidden="true" />
                          {formatDate(booking.startsAt)} ·{" "}
                          {formatTime(booking.startsAt)}–
                          {formatTime(booking.endsAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Wallet className="size-4" aria-hidden="true" />
                          {formatNaira(booking.agreedRate)} / hour
                        </span>
                      </div>

                      {booking.notes ? (
                        <p className="whitespace-pre-line text-foreground">
                          {booking.notes}
                        </p>
                      ) : null}

                      {booking.status === "confirmed" ? (
                        <BookingActions
                          bookingId={booking.id}
                          action={cancelRequesterBookingAction}
                          intents={REQUESTER_INTENTS}
                        />
                      ) : null}

                      {booking.status === "cancelled" ? (
                        <p className="flex items-center gap-1.5">
                          <CalendarX className="size-4" aria-hidden="true" />
                          This session was cancelled.
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