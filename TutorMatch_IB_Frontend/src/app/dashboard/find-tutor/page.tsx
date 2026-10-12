import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  TutorDiscoveryForm,
  TutorDiscoveryResults,
} from "@/components/tutors/tutor-discovery";
import { getTutorSummaries } from "@/lib/supabase/queries/tutors";
import { parseTutorDiscoverySearchParams } from "@/lib/validation/tutor-discovery";

export const metadata: Metadata = {
  title: "Find a tutor",
  description:
    "Browse tutors by subject, level, location, budget and availability.",
};

/** Dynamic: discovery reads live tutor rows through RLS. */
export const dynamic = "force-dynamic";

/**
 * Interim discovery within the dashboard. The Phase 7 free-text matching lets a
 * student describe a need in English; until that ships, this reuses the same
 * live discovery the marketing site uses, so the shared components keep the two
 * entry points in sync. It reads `searchParams` so filter links and pagination
 * work exactly as they do on `/find-tutors`.
 */
export default async function FindTutorPage({
  searchParams,
}: PageProps<"/dashboard/find-tutor">) {
  const params = await searchParams;
  const search = parseTutorDiscoverySearchParams(params);
  const result = await getTutorSummaries(search);

  return (
    <>
      <DashboardHeader
        title="Find a tutor"
        description="Filter the live catalogue by subject, level, location, budget and availability."
      />
      <TutorDiscoveryForm subjects={result.subjects} filters={search.filters} />
      <div className="pb-4">
        <TutorDiscoveryResults result={result} filters={search.filters} />
      </div>
    </>
  );
}