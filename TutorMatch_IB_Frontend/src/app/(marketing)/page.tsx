import type { Metadata } from "next";

import { FeaturedTutors } from "@/components/marketing/featured-tutors";
import { FinalCta } from "@/components/marketing/final-cta";
import { ForTutors } from "@/components/marketing/for-tutors";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PlatformStats } from "@/components/marketing/platform-stats";
import { TutorRequestSearch } from "@/components/marketing/tutor-request-search";
import { WhyTutorMatch } from "@/components/marketing/why-tutormatch";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} \u2014 Find the Right Tutor` },
  description:
    "Find the right tutor and learn with confidence. TutorMatch IB matches students and parents with tutors by subject, level, location, availability, budget and experience, then lets you request and book a session directly.",
  alternates: { canonical: "/" },
};

/**
 * Public landing page.
 *
 * Server Components only. Section order alternates surface tones for rhythm:
 * hero (tinted) -> search (white) -> stats (navy) -> steps (white) ->
 * featured (tinted) -> why (white) -> for tutors (tinted) -> final CTA (navy).
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <TutorRequestSearch />
      <PlatformStats />
      <HowItWorks />
      <FeaturedTutors />
      <WhyTutorMatch />
      <ForTutors />
      <FinalCta />
    </>
  );
}
