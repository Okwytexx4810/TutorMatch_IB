import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Availability",
  description: "Set the days and times you are available to teach.",
};

export default function TutorAvailabilityPage() {
  return (
    <>
      <DashboardHeader
        title="Availability"
        description="Set the days and time periods you are available to teach."
      />
      <PagePlaceholder
        phase="Phase 5 &mdash; Tutor onboarding"
        title="Weekly availability"
        description="Availability is stored as day + period slots and compared directly against a student's requested slots by the matching engine."
        features={[
          "Toggle each day and period slot",
          "Optional exact start time per slot",
          "Bulk copy a day onto another",
          "Mark slots as no longer available",
        ]}
      />
    </>
  );
}
