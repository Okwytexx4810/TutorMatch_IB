import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CalendarX, UserPlus, Wallet } from "lucide-react";

import { updateTutorBookingStatusAction } from "@/app/tutor/actions";
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
import { requireRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getTutorBookings } from "@/lib/supabase/queries/bookings";
import { getCurrentTutorProfile } from "@/lib/supabase/queries/tutor-profile";
import { formatDate, formatNaira, formatTime } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Tutor sessions",
  description: "Sessions booked from your accepted requests.",
};

export const dynamic = "force-dynamic";

const TUTOR_INTENTS: BookingActionIntent[] = [
  { intent: "complete", label: "Mark completed", icon: "check" },
  { intent: "cancel", label: "Cancel session", variant: "outline", icon: "x" },
];

export default async function TutorBookingsPage() {
  await requireRole(["tutor"], ROUTES.tutorBookings);
  const tutorProfile = await getCurrentTutorProfile();

  if (!tutorProfile) {
    return (
      <>
        <DashboardHeader
          title="Sessions"
          description="Sessions booked from your accepted requests."
        />
        <div className="p-4 sm:p-6">
          <EmptyState
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            title="Set up your tutor profile first"
            description="Bookings belong to your tutor profile, so it has to exist before students can book you."
            action={
              <Button asChild size="sm">
                <Link href={ROUTES.tutorProfileSettings}>
                  Create tutor profile
                </Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const { bookings, isError } = await getTutorBookings(tutorProfile.id);

  return (
    <>
      <DashboardHeader
        title="Sessions"
        description="Completed and upcoming sessions. The student's contact stays private until you accept their request."
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
            description="Accept a request and agree a time, and the session appears here."
            action={
              <Button asChild size="sm">
                <Link href={ROUTES.tutorRequests}>View requests</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <CardTitle className="text-base">
                      {booking.subject}
                    </CardTitle>
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
                        action={updateTutorBookingStatusAction}
                        intents={TUTOR_INTENTS}
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
            ))}
          </ul>
        )}
      </div>
    </>
  );
}