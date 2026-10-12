import type { Metadata } from "next";
import {
  BadgeCheck,
  GraduationCap,
  Mail,
  MapPin,
  ShieldQuestion,
  Wallet,
} from "lucide-react";

import { TutorVerifyButton } from "@/components/admin/tutor-verify-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getAdminTutors } from "@/lib/supabase/queries/admin";
import { formatNaira } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Tutors",
  description: "Verify and review every tutor profile.",
};

export const dynamic = "force-dynamic";

export default async function AdminTutorsPage() {
  await requireRole(["admin"], ROUTES.adminTutors);

  const { tutors, isError } = await getAdminTutors();

  return (
    <>
      <DashboardHeader
        title="Tutors"
        description="Every tutor profile. Verifying a tutor marks them as trusted."
      />

      <div className="grid gap-4 p-4 sm:p-6">
        {isError ? (
          <ErrorState
            title="We could not load tutors"
            description="Please refresh the page to try again."
          />
        ) : tutors.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="size-5" aria-hidden="true" />}
            title="No tutor profiles yet"
            description="Tutors who create a profile will appear here for verification."
          />
        ) : (
          <ul className="grid gap-4">
            {tutors.map((tutor) => (
              <li key={tutor.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        {tutor.displayName?.trim() ||
                          tutor.headline ||
                          tutor.ownerName}
                        {tutor.isVerified ? (
                          <Badge className="gap-1">
                            <BadgeCheck
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <ShieldQuestion
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            Unverified
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tutor.ownerName}
                        {tutor.ownerEmail ? ` · ${tutor.ownerEmail}` : ""}
                      </p>
                    </div>
                    <TutorVerifyButton
                      tutorId={tutor.id}
                      isVerified={tutor.isVerified}
                    />
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    {tutor.headline ? (
                      <p className="text-foreground">{tutor.headline}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-4" aria-hidden="true" />
                        {tutor.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Wallet className="size-4" aria-hidden="true" />
                        {formatNaira(tutor.hourlyRate)} / hour
                      </span>
                      <span>
                        {tutor.yearsOfExperience} yr
                        {tutor.yearsOfExperience === 1 ? "" : "s"} experience
                      </span>
                      <span>{tutor.profileCompleteness}% complete</span>
                    </div>
                    {tutor.ownerEmail ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="size-4" aria-hidden="true" />
                        <a
                          href={`mailto:${tutor.ownerEmail}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {tutor.ownerEmail}
                        </a>
                      </span>
                    ) : null}
                    {tutor.subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {tutor.subjects.map((subject) => (
                          <Badge key={subject} variant="outline">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p>No subjects listed yet.</p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
