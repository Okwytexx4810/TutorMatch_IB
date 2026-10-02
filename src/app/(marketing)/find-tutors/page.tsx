import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Find tutors",
  description:
    "Search and filter tutors by subject, location, budget, availability and teaching mode.",
};

export default function FindTutorsPage() {
  return (
    <div className="container-page py-10">
      <PagePlaceholder
        phase="Phase 6 &mdash; Tutor discovery"
        title="Find tutors"
        description="Filter-based search and the results grid land on this route."
        features={[
          "Filter by subject",
          "Filter by location",
          "Filter by budget ceiling",
          "Filter by availability",
          "Filter by teaching mode",
          "Sort by relevance or rating",
        ]}
        action={{ href: ROUTES.dashboardFindTutor, label: "Describe your needs" }}
      />
    </div>
  );
}
