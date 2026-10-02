import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your learner or parent profile and default requirements.",
};

export default function DashboardProfilePage() {
  return (
    <>
      <DashboardHeader
        title="Profile"
        description="Your learner or parent details and default requirements."
      />
      <PagePlaceholder
        phase="Phase 4 &mdash; Supabase database"
        title="Profile"
        description="Backed by the profiles table, writable only by the owner via Row Level Security."
        features={[
          "Full name and phone number",
          "Default location",
          "Default budget and preferred mode",
          "Saved requirement presets",
        ]}
      />
    </>
  );
}
