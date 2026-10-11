import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Tutor profile",
  description:
    "Full tutor profile: bio, subjects, qualifications, rates, availability and reviews.",
};

/**
 * Public tutor profile route.
 *
 * Note for later phases: in Next.js 16 `params` is a Promise, so this must
 * become `async` and `await props.params` when real data is wired in.
 */
export default function TutorProfilePage() {
  return (
    <div className="container-page py-10">
      <PagePlaceholder
        phase="Phase 6 &mdash; Tutor discovery"
        title="Tutor profile"
        description="The profile page reads a single tutor by id, including live availability."
        features={[
          "Bio, subjects and qualifications",
          "Hourly rate and teaching modes",
          "Weekly availability selector",
          "Reviews and average rating",
          "Match score breakdown",
          "Send request action",
        ]}
        action={{ href: ROUTES.findTutors, label: "Back to search" }}
      />
    </div>
  );
}
