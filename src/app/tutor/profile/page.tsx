import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Tutor profile",
  description: "Your public tutor profile, rates, subjects and qualifications.",
};

export default function TutorProfileSettingsPage() {
  return (
    <>
      <DashboardHeader
        title="My tutor profile"
        description="This is what students see when they view your profile."
      />
      <PagePlaceholder
        phase="Phase 5 &mdash; Tutor onboarding"
        title="Tutor profile"
        description="The profile is the source of truth the matching engine reads. Every field here affects a tutor's match score."
        features={[
          "Bio and headline",
          "Subjects taught and levels supported",
          "Qualifications with institution and year",
          "Years of experience",
          "Hourly rate in naira",
          "Teaching mode and location",
        ]}
      />
    </>
  );
}
