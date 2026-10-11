import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  TutorProfileForm,
  type TutorProfileFormValues,
} from "@/components/forms/tutor-profile-form";
import { getCurrentTutorProfile } from "@/lib/supabase/queries/tutor-profile";

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
 * Subjects and qualifications are not edited here. They live in their own
 * tables, are scoped per subject and level, and are a separate milestone; this
 * page deliberately covers the `tutor_profiles` row only.
 */
export default async function TutorProfileSettingsPage() {
  const profile = await getCurrentTutorProfile();

  // Narrowed to the fields the form renders, so nothing extra crosses the
  // server/client boundary.
  const values: TutorProfileFormValues | null = profile
    ? {
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        hourly_rate: profile.hourly_rate,
        years_of_experience: profile.years_of_experience,
        is_verified: profile.is_verified,
        profile_completeness: profile.profile_completeness,
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
