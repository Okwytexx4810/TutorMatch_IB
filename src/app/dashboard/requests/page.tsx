import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/layout/empty-state";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "My requests",
  description: "Track the status of tutor requests you have sent.",
};

export default function DashboardRequestsPage() {
  return (
    <>
      <DashboardHeader
        title="My requests"
        description="Track every request from pending through to booking."
      />
      <PagePlaceholder
        phase="Phase 9 &mdash; Request and booking workflow"
        title="Requests"
        description="A request is submitted to one tutor, and moves through pending, accepted, declined or cancelled."
        features={[
          "Pending / accepted / declined badges",
          "Withdraw a pending request",
          "Convert an accepted request to a booking",
          "Message the tutor",
        ]}
      />
      <EmptyState
        className="mt-8"
        title="You have not sent any requests"
        description="Once you shortlist a tutor you can send them a request with your preferred days and times."
      />
    </>
  );
}
