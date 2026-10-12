import type { Metadata } from "next";
import { CalendarCheck, Clock, Inbox, Mail, MapPin, Wallet } from "lucide-react";

import { AdminRequestActions } from "@/components/admin/admin-request-actions";
import { RequestStatusBadge } from "@/components/engagement/status-badge";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
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
import { getAdminRequests } from "@/lib/supabase/queries/admin";
import type { RequestStatus } from "@/types/engagement";
import { formatDate, formatNaira } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Applications",
  description: "Review and manage every tutoring application.",
};

export const dynamic = "force-dynamic";

const ADMIN_ORDER: Record<RequestStatus, number> = {
  pending: 0,
  accepted: 1,
  declined: 2,
  cancelled: 3,
};

function slotLabel(slots: { day: string; period: string }[]): string | null {
  const slot = slots[0];
  return slot ? `${slot.day} ${slot.period}` : null;
}

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  parent: "Parent",
  tutor: "Tutor",
  admin: "Admin",
};

export default async function AdminRequestsPage() {
  await requireRole(["admin"], ROUTES.adminRequests);

  const { requests, isError } = await getAdminRequests();

  const ordered = requests
    .slice()
    .sort((a, b) => {
      const byStatus = ADMIN_ORDER[a.status] - ADMIN_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <>
      <DashboardHeader
        title="Applications"
        description="Every request sent by a student or parent. Accept, decline or close them here."
      />

      <div className="grid gap-5 p-4 sm:p-6">
        {isError ? (
          <ErrorState
            title="We could not load applications"
            description="Please refresh the page to try again."
          />
        ) : ordered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" aria-hidden="true" />}
            title="No applications yet"
            description="When a student or parent requests a tutor, their application will appear here."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {requests.length} total · {pendingCount} pending
            </p>

            <ul className="grid gap-4">
              {ordered.map((request) => {
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
                            Applied {formatDate(request.createdAt)}
                          </p>
                        </div>
                        <RequestStatusBadge status={request.status} />
                      </CardHeader>

                      <CardContent className="space-y-3 text-sm">
                        <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <dt className="text-muted-foreground">From</dt>
                            <dd className="flex min-w-0 items-center gap-1.5 font-medium">
                              <span className="truncate">
                                {request.requester?.fullName ?? "Unknown"}
                              </span>
                              {request.requester ? (
                                <Badge variant="outline">
                                  {ROLE_LABEL[request.requester.role] ??
                                    request.requester.role}
                                </Badge>
                              ) : null}
                            </dd>
                          </div>
                          <div className="flex min-w-0 items-center gap-2">
                            <dt className="text-muted-foreground">To</dt>
                            <dd className="truncate font-medium">
                              {request.tutor?.displayName || "Unknown tutor"}
                            </dd>
                          </div>
                          {request.requester?.email ? (
                            <div className="flex min-w-0 items-center gap-2">
                              <dt className="sr-only">Email</dt>
                              <dd className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                <Mail
                                  className="size-4 shrink-0"
                                  aria-hidden="true"
                                />
                                <a
                                  href={`mailto:${request.requester.email}`}
                                  className="truncate underline-offset-4 hover:underline"
                                >
                                  {request.requester.email}
                                </a>
                              </dd>
                            </div>
                          ) : null}
                        </dl>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground">
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
                          {request.status === "accepted" ? (
                            <span className="flex items-center gap-1.5">
                              <CalendarCheck
                                className="size-4"
                                aria-hidden="true"
                              />
                              Accepted{" "}
                              {request.respondedAt
                                ? formatDate(request.respondedAt)
                                : ""}
                            </span>
                          ) : null}
                        </div>

                        {request.message ? (
                          <p className="whitespace-pre-line text-foreground">
                            {request.message}
                          </p>
                        ) : null}

                        <AdminRequestActions
                          requestId={request.id}
                          status={request.status}
                        />
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
