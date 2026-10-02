import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/layout/empty-state";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Bookings",
  description: "Your confirmed, completed and cancelled tutoring sessions.",
};

export default function DashboardBookingsPage() {
  return (
    <>
      <DashboardHeader
        title="Bookings"
        description="Confirmed and past tutoring sessions."
      />
      <PagePlaceholder
        phase="Phase 9 &mdash; Request and booking workflow"
        title="Bookings"
        description="A booking is created when a tutor accepts a request and a session time is agreed."
        features={[
          "Upcoming and past sessions",
          "Session time, duration and agreed rate",
          "Cancel a confirmed session",
          "Leave a review after completion",
        ]}
      />
      <EmptyState
        className="mt-8"
        title="No bookings yet"
        description="Accepted requests become bookings. Your confirmed sessions will appear here."
      />
    </>
  );
}
