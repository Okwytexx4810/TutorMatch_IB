import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Find a tutor",
  description:
    "Describe your tutoring needs in plain English and get a ranked shortlist.",
};

export default function FindTutorPage() {
  return (
    <>
      <DashboardHeader
        title="Find a tutor"
        description="Describe what you need in plain English."
      />
      <PagePlaceholder
        phase="Phases 7 &amp; 8 &mdash; Matching and AI"
        title="Describe your tutoring needs"
        description="This is the product's core moment. The student writes a free-text requirement, OpenAI extracts structured fields, and the deterministic matching engine ranks real tutors against it."
        features={[
          "Free-text requirement input",
          "Structured field preview and editing",
          "Deterministic match score per tutor",
          "Per-criterion score breakdown",
          "Send request from a result",
        ]}
      />
    </>
  );
}
