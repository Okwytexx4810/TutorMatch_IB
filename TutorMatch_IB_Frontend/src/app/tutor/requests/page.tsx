import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Clock, MapPin, UserPlus, Wallet } from "lucide-react";

import { scheduleTutorBookingAction } from "@/app/tutor/actions";
import { ScheduleBookingForm } from "@/components/bookings/schedule-booking-form";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getTutorRequests } from "@/lib/supabase/queries/requests";
import { getCurrentTutorProfile } from "@/lib/supabase/queries/tutor-profile";
import { formatDate, formatNaira } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Tutor requests",
  description: "Review, accept or decline incoming tutoring requests.",
};

export const dynamic = "force-dynamic";

function slotLabel(slots: { day: string; period: string }[]): string | null {
  const slot = slots[0];
  return slot ? `${slot.day} ${slot.period}` : null;
}

export default async function TutorRequestsPage() {
  await requireRole(["tutor"], ROUTES.tutorRequests);
  const tutorProfile = await getCurrentTutorProfile();

  if (!tutorProfile) {
    return (
      <>
        <DashboardHeader
          title="Requests"
          description="Review, accept or decline incoming tutoring requests."
        />
        <div className="p-4 sm:p-6">
          <EmptyState
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            title="Set up your tutor profile first"
            description="Requests are addressed to your tutor profile, so it has to exist before students can reach you."
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

  const { requests, isError } = await getTutorRequests(tutorProfile.id);

  return (
    <>
      <DashboardHeader
        title="Requests"
        description="Students requesting your time. Their name and contact stay private until you accept."
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
            title="No requests yet"
            description="Students matched to your subjects, location and rate will appear here."
          />
        ) : (
          <ul className="grid gap-4">
            {requests.map((request) => {
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
                            {slot}
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

                      {request.status === "pending" ? (
                        <RespondToRequestButtons requestId={request.id} />
                      ) : null}

                      {request.status === "accepted" &&
                      !request.hasConfirmedBooking ? (
                        <ScheduleBookingForm
                          requestId={request.id}
                          action={scheduleTutorBookingAction}
                          description="Confirm a time with the student and book the session."
                        />
                      ) : null}

                      {request.status === "accepted" &&
                      request.hasConfirmedBooking ? (
                        <p className="flex items-center gap-1.5 text-foreground">
                          <CalendarCheck className="size-4" aria-hidden="true" />
                          A session is booked for this request. See{" "}
                          <Link
                            href={ROUTES.tutorBookings}
                            className="underline underline-offset-4"
                          >
                            your sessions
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