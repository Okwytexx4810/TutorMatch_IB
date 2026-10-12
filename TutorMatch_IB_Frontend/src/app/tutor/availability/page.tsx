import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TutorAvailabilityForm } from "@/components/forms/tutor-availability-form";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getCurrentTutorAvailability } from "@/lib/supabase/queries/availability";
import { getCurrentTutorProfile } from "@/lib/supabase/queries/tutor-profile";

export const metadata: Metadata = {
  title: "Availability",
  description: "Set the days and times you are available to teach.",
};

export const dynamic = "force-dynamic";

export default async function TutorAvailabilityPage() {
  await requireRole(["tutor"], ROUTES.tutorAvailability);
  const tutorProfile = await getCurrentTutorProfile();

  if (!tutorProfile) {
    return (
      <>
        <DashboardHeader
          title="Availability"
          description="Set the days and time periods you are available to teach."
        />
        <div className="p-4 sm:p-6">
          <EmptyState
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            title="Create your tutor profile first"
            description="Availability belongs to your tutor profile, so it has to exist before you can set your weekly slots."
            action={
              <Button asChild size="sm">
                <Link href={ROUTES.tutorProfileSettings}>
                  Create tutor profile
                </Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const { slots } = await getCurrentTutorAvailability();

  return (
    <>
      <DashboardHeader
        title="Availability"
        description="Set the days and time periods you are available to teach."
      />
      <div className="p-4 sm:p-6">
        <TutorAvailabilityForm slots={slots} />
      </div>
    </>
  );
}
