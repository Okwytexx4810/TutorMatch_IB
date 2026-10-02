import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/layout/empty-state";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Tutor bookings",
  description: "Your confirmed and completed tutoring sessions.",
};

export default function TutorBookingsPage() {
  return (
    <>
      <DashboardHeader
        title="Bookings"
        description="Your confirmed and completed tutoring sessions."
      />
      <PagePlaceholder
        phase="Phase 9 &mdash; Request and booking workflow"
        title="Sessions"
        description="Bookings come from accepted requests and belong to both sides of the session."
        features={[
          "Upcoming sessions with date and time",
          "Session history",
          "Mark a session completed",
          "Reviews received",
        ]}
      />
      <EmptyState
        className="mt-8"
        title="No bookings yet"
        description="When you accept a request, the agreed session appears here."
      />
    </>
  );
}
