import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/marketing/section-heading";
import { TutorCard } from "@/components/tutors/tutor-card";
import { Button } from "@/components/ui/button";
import { featuredTutors } from "@/lib/mock-data/tutors";
import { ROUTES } from "@/lib/site-config";

/**
 * Sample tutors from `@/lib/mock-data/tutors`, which Phase 4 replaces with a
 * Supabase query. `TutorCard` is already typed against `TutorSummary`, so this
 * section swaps its data source and nothing else.
 */
export function FeaturedTutors() {
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
          {featuredTutors.map((tutor) => (
            <TutorCard
              key={tutor.id}
              tutor={tutor}
              matchScore={tutor.matchScore}
            />
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Sample profiles shown for this preview. Tutors join with their own
          qualifications, rates and availability.
        </p>
      </div>
    </section>
  );
}
