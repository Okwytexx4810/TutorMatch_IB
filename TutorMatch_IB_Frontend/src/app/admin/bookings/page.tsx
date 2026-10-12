import type { Metadata } from "next";
import { CalendarClock, CalendarX, CalendarDays, Mail, Wallet } from "lucide-react";

import { manageBookingAction } from "@/app/admin/actions";
import {
  BookingActions,
  type BookingActionIntent,
} from "@/components/bookings/booking-actions";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BookingStatusBadge } from "@/components/engagement/status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getAdminBookings } from "@/lib/supabase/queries/admin";
import { formatDate, formatNaira, formatTime } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Sessions",
  description: "Oversee every tutoring session on the platform.",
};

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  parent: "Parent",
  tutor: "Tutor",
  admin: "Admin",
};

/** What an administrator can do with a confirmed session. */
const ADMIN_INTENTS: BookingActionIntent[] = [
  {
    intent: "complete",
    label: "Mark completed",
    variant: "default",
    icon: "check",
  },
  {
    intent: "no_show",
    label: "Record no-show",
    variant: "outline",
  },
  {
    intent: "cancel",
    label: "Cancel session",
    variant: "outline",
    icon: "x",
  },
];

export default async function AdminBookingsPage() {
  await requireRole(["admin"], ROUTES.adminBookings);

  const { bookings, isError } = await getAdminBookings();

  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;

  return (
    <>
      <DashboardHeader
        title="Sessions"
        description="Every tutoring session on the platform. The tutor runs their own sessions; here you can mark them completed, cancel them, or record a no-show."
      />

      <div className="grid gap-5 p-4 sm:p-6">
        {isError ? (
          <ErrorState
            title="We could not load sessions"
            description="Please refresh the page to try again."
          />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-5" aria-hidden="true" />}
            title="No sessions yet"
            description="Once a tutor schedules a session from an accepted request, it will appear here."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {bookings.length} total · {confirmedCount} confirmed
            </p>

            <ul className="grid gap-4">
              {bookings.map((booking) => {
                const tutorName = booking.tutor?.displayName || "Unknown tutor";
                const requesterName =
                  booking.requester?.fullName ?? "Unknown requester";

                return (
                  <li key={booking.id}>
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="min-w-0">
                          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                            {booking.subject}
                            <span className="text-sm font-normal text-muted-foreground">
                              {tutorName}
                            </span>
                          </CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatDate(booking.startsAt)} ·{" "}
                            {formatTime(booking.startsAt)}–
                            {formatTime(booking.endsAt)}
                          </p>
                        </div>
                        <BookingStatusBadge status={booking.status} />
                      </CardHeader>

                      <CardContent className="space-y-3 text-sm">
                        <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <dt className="text-muted-foreground">With</dt>
                            <dd className="flex min-w-0 items-center gap-1.5 font-medium">
                              <span className="truncate">{requesterName}</span>
                              {booking.requester ? (
                                <Badge variant="outline">
                                  {ROLE_LABEL[booking.requester.role] ??
                                    booking.requester.role}
                                </Badge>
                              ) : null}
                            </dd>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Wallet className="size-4 shrink-0" aria-hidden="true" />
                            {formatNaira(booking.agreedRate)} / hour
                          </div>
                          {booking.requester?.email ? (
                            <div className="flex min-w-0 items-center gap-2">
                              <dt className="sr-only">Email</dt>
                              <dd className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                <Mail
                                  className="size-4 shrink-0"
                                  aria-hidden="true"
                                />
                                <a
                                  href={`mailto:${booking.requester.email}`}
                                  className="truncate underline-offset-4 hover:underline"
                                >
                                  {booking.requester.email}
                                </a>
                              </dd>
                            </div>
                          ) : null}
                        </dl>

                        {booking.notes ? (
                          <p className="whitespace-pre-line text-foreground">
                            {booking.notes}
                          </p>
                        ) : null}

                        {booking.status === "confirmed" ? (
                          <BookingActions
                            bookingId={booking.id}
                            action={manageBookingAction}
                            intents={ADMIN_INTENTS}
                          />
                        ) : booking.status === "cancelled" ? (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <CalendarX className="size-4" aria-hidden="true" />
                            This session was cancelled.
                          </p>
                        ) : (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <CalendarClock className="size-4" aria-hidden="true" />
                            This session is no longer active.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}