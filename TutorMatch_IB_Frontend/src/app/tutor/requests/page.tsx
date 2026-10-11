import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/layout/empty-state";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Tutor requests",
  description: "Review, accept or decline incoming tutoring requests.",
};

export default function TutorRequestsPage() {
  return (
    <>
      <DashboardHeader
        title="Requests"
        description="Review, accept or decline incoming tutoring requests."
      />
      <PagePlaceholder
        phase="Phase 9 &mdash; Request and booking workflow"
        title="Incoming requests"
        description="A student request carries their subject, message, preferred slots and budget."
        features={[
          "Pending request list",
          "Student and requirement detail per request",
          "Accept or decline with one action",
          "Propose a different slot",
        ]}
      />
      <EmptyState
        className="mt-8"
        title="No requests yet"
        description="Students are matched against your subjects, location, availability and rate. Requests appear here."
      />
    </>
  );
}
