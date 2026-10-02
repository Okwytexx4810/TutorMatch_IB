import type { Metadata } from "next";
import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/layout/empty-state";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Tutor dashboard",
  description: "Incoming requests, upcoming sessions and your availability.",
};

export default function TutorDashboardPage() {
  return (
    <>
      <DashboardHeader
        title="Tutor dashboard"
        description="Incoming requests and your upcoming sessions."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={ROUTES.tutorProfileSettings}>Edit profile</Link>
          </Button>
        }
      />

      <PagePlaceholder
        phase="Phase 10 &mdash; Dashboards"
        title="Tutor overview"
        description="Everything a tutor needs on one screen, backed by real rows."
        features={[
          "Incoming request count",
          "Sessions booked this week",
          "Next session card",
          "Profile completeness meter",
          "Average rating summary",
        ]}
      />

      <EmptyState
        className="mt-8"
        title="No incoming requests"
        description="Complete your profile and set your availability so students can match you."
      />
    </>
  );
}
