import { CalendarClock, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { SectionHeading } from "@/components/marketing/section-heading";

const advantages = [
  {
    icon: SlidersHorizontal,
    title: "Personalized matching",
    body: "Find tutors based on what actually matters to you.",
  },
  {
    icon: CalendarClock,
    title: "Flexible learning",
    body: "Choose tutors based on schedule, location and teaching mode.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted profiles",
    body: "Understand a tutor's experience, subjects and reviews before requesting a session.",
  },
] as const;

export function WhyTutorMatch() {
  return (
    <section className="bg-background">
      <div className="container-page py-16 lg:py-24">
        <SectionHeading
          eyebrow="Why TutorMatch IB"
          title="A shortlist you can actually trust."
          description="Generic tutor directories make you read every profile yourself. We do the comparing, and show our working."
        />

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {advantages.map((advantage) => (
            <div key={advantage.title}>
              <span
                className="flex size-10 items-center justify-center rounded-lg bg-brand-navy-deep text-primary-foreground"
                aria-hidden="true"
              >
                <advantage.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {advantage.title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">
                {advantage.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
