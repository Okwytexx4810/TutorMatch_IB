import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About",
  description: "Why TutorMatch IB exists and who builds it.",
};

export default function AboutPage() {
  return (
    <div className="container-page py-10">
      <PagePlaceholder
        phase="Phase 2 &mdash; Content"
        title="About TutorMatch IB"
        description="The founder story, the team and the reason the product focuses on shortlists instead of directories."
        features={[
          "Founder and team",
          "Problem we set out to solve",
          "How matching is approached",
          "Where the product is heading",
        ]}
        action={{ href: ROUTES.findTutors, label: "Find a tutor" }}
      />
    </div>
  );
}
