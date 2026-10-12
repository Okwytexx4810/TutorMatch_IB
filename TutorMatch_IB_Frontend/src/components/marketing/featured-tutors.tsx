import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/marketing/section-heading";
import { TutorCard } from "@/components/tutors/tutor-card";
import { Button } from "@/components/ui/button";
import { getTutorSummaries } from "@/lib/supabase/queries/tutors";
import { EMPTY_TUTOR_DISCOVERY_FILTERS } from "@/lib/validation/tutor-discovery";
import { ROUTES } from "@/lib/site-config";

/**
 * A live slice of the discovery catalogue: the three most recently joined
 * profiles, read through RLS with the shared discovery query. When no tutors
 * exist yet the section hides entirely rather than showing an empty grid.
 */
export async function FeaturedTutors() {
  const result = await getTutorSummaries({
    filters: EMPTY_TUTOR_DISCOVERY_FILTERS,
    page: 1,
  });

  if (result.isError || result.tutors.length === 0) return null;

  const featured = result.tutors.slice(0, 3);

  return (
    <section className="border-y bg-brand-surface">
      <div className="container-page py-16 lg:py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Featured tutors"
            title="Tutors students are asking for."
            description="Every profile shows the details that decide a session: subjects, area, experience, rating and price."
          />

          <Button variant="outline" size="lg" className="self-start sm:self-auto" asChild>
            <Link href={ROUTES.findTutors}>
              Browse all tutors
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((tutor) => (
            <TutorCard key={tutor.id} tutor={tutor} />
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Live tutor profiles. Tutors join with their own subjects, qualifications
          and availability.
        </p>
      </div>
    </section>
  );
}