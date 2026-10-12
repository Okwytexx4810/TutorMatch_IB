import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  TutorProfileForm,
  type TutorProfileFormValues,
} from "@/components/forms/tutor-profile-form";
import {
  getCurrentTutorOfferings,
  getCurrentTutorProfile,
} from "@/lib/supabase/queries/tutor-profile";

export const metadata: Metadata = {
  title: "Tutor profile",
  description: "Your public tutor profile, rates, subjects and qualifications.",
};

/**
 * Tutor profile settings.
 *
 * A Server Component: the session is read here, on the server, and only the
 * displayable subset is handed to the Client Component. The browser never sees
 * `profile_id`, `id` or the timestamps, and has no way to change who the row
 * belongs to.
 *
 * The route is already protected by `requireRole(["tutor"])` in the parent
 * layout, so a profile read here always has an authenticated owner. No
 * ownership check is repeated in this file.
 *
 * The subjects and levels shown here are the tutor's offerings in
 * `tutor_subjects`; saving the form reconciles that table alongside the
 * `tutor_profiles` row, which is what makes a saved profile visible in
 * discovery and bookable. Qualifications and availability are still separate
 * milestones and are not edited here.
 */
export default async function TutorProfileSettingsPage() {
  const [profile, offerings] = await Promise.all([
    getCurrentTutorProfile(),
    getCurrentTutorOfferings(),
  ]);

  // Narrowed to the fields the form renders, so nothing extra crosses the
  // server/client boundary.
  const values: TutorProfileFormValues | null = profile
    ? {
        display_name: profile.display_name,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        hourly_rate: profile.hourly_rate,
        years_of_experience: profile.years_of_experience,
        is_verified: profile.is_verified,
        profile_completeness: profile.profile_completeness,
        subjects: offerings.subjects,
        levels: offerings.levels,
      }
    : null;

  return (
    <>
      <DashboardHeader
        title="My tutor profile"
        description="This is what students see when they view your profile."
      />
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <TutorProfileForm profile={values} />
        </div>
      </div>
    </>
  );
}
