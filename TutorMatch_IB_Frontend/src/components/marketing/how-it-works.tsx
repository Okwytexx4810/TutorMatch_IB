import { Fragment } from "react";
import {
  ArrowRight,
  CalendarCheck,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

import { SectionHeading } from "@/components/marketing/section-heading";

const steps = [
  {
    icon: MessageSquareText,
    title: "Tell us what you need",
    body: "Share your subject, goals, schedule, location and budget.",
  },
  {
    icon: Sparkles,
    title: "Discover your matches",
    body: "Explore tutors ranked by how well they fit your requirements.",
  },
  {
    icon: CalendarCheck,
    title: "Connect and learn",
    body: "Send a request, confirm a session and start learning.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-background">
      <div className="container-page py-16 lg:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps from searching to studying."
          description="No back-and-forth with dozens of tutors. Describe the requirement once and work from a ranked shortlist."
        />

        <ol className="mt-12 grid gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center lg:gap-8">
          {steps.map((step, index) => (
            <Fragment key={step.title}>
              <li className="flex gap-4 sm:gap-5">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"
                  aria-hidden="true"
                >
                  <step.icon className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-brand-emerald-deep uppercase tabular-nums">
                    Step {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-sm leading-relaxed text-muted-foreground text-pretty">
                    {step.body}
                  </p>
                </div>
              </li>

              {/* Decorative connector. `aria-hidden` keeps it out of the list. */}
              {index < steps.length - 1 ? (
                <li
                  aria-hidden="true"
                  className="hidden items-center justify-center text-muted-foreground/40 lg:flex"
                >
                  <ArrowRight className="size-5" />
                </li>
              ) : null}
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  );
}
