import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock,
  GraduationCap,
  Inbox,
  LifeBuoy,
  Users,
} from "lucide-react";

import { RequestStatusBadge } from "@/components/engagement/status-badge";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getAdminRequests, getAdminStats } from "@/lib/supabase/queries/admin";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Admin overview",
  description: "Platform statistics and the newest applications.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole(["admin"], ROUTES.admin);

  const [stats, { requests, isError }] = await Promise.all([
    getAdminStats(),
    getAdminRequests(),
  ]);

  const cards = [
    { label: "Users", value: stats.users, icon: Users, href: ROUTES.adminUsers },
    {
      label: "Students & parents",
      value: stats.learners,
      icon: LifeBuoy,
      href: ROUTES.adminUsers,
    },
    {
      label: "Tutors",
      value: stats.tutors,
      icon: GraduationCap,
      href: ROUTES.adminTutors,
    },
    {
      label: "Applications",
      value: stats.requests,
      icon: Inbox,
      href: ROUTES.adminRequests,
    },
    {
      label: "Pending applications",
      value: stats.pendingRequests,
      icon: Clock,
      href: ROUTES.adminRequests,
    },
    {
      label: "Bookings",
      value: stats.bookings,
      icon: BookOpen,
      href: ROUTES.adminBookings,
    },
  ] as const;

  const recent = requests.slice(0, 6);

  return (
    <>
      <DashboardHeader
        title="Admin"
        description="Platform overview and every application that needs attention."
        actions={
          <Button asChild size="sm">
            <Link href={ROUTES.adminRequests}>
              Review applications
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 p-4 sm:p-6">
        {stats.isError ? (
          <ErrorState
            title="We could not load platform statistics"
            description="The counts below may be incomplete. Refresh to try again."
          />
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader>
                <span
                  className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                  aria-hidden="true"
                >
                  <card.icon className="size-4" />
                </span>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {stats.isError ? "—" : card.value}
                </CardTitle>
                <CardDescription>
                  <Link
                    href={card.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {card.label}
                  </Link>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <section aria-labelledby="recent-applications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle
                  id="recent-applications"
                  className="text-base"
                >
                  Recent applications
                </CardTitle>
                <CardDescription>
                  The newest requests from students and parents.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTES.adminRequests}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isError ? (
                <p className="text-sm text-muted-foreground">
                  Applications could not be loaded right now.
                </p>
              ) : recent.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="size-5" aria-hidden="true" />}
                  title="No applications yet"
                  description="Requests sent by students and parents will appear here for review."
                />
              ) : (
                <ul className="divide-y">
                  {recent.map((request) => (
                    <li
                      key={request.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {request.subject}
                          {request.level ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {request.level}
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {request.requester?.fullName ?? "Unknown requester"} →{" "}
                          {request.tutor?.displayName || "Unknown tutor"} ·{" "}
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <RequestStatusBadge status={request.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
