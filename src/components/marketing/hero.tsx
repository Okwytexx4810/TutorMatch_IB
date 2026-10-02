import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/site-config";

/** The example request quoted on the landing page. Also used by the docs. */
const exampleRequest =
  "I need a patient Mathematics tutor for WAEC preparation. My daughter is available Tuesday and Thursday evenings and we prefer someone around Bodija. Our budget is around \u20a67,000 per lesson.";

/** Criteria the engine derives from the sentence above. */
const derivedCriteria = [
  { label: "Subject", value: "Mathematics" },
  { label: "Level", value: "WAEC" },
  { label: "Location", value: "Bodija" },
  { label: "Availability", value: "Tue & Thu, evenings" },
  { label: "Budget", value: "\u20a67,000 / lesson" },
];

const trustPoints = [
  "Tutor profiles you can actually verify",
  "Transparent pricing before you enquire",
  "No booking fees charged to students",
];

/**
 * Above-the-fold hero.
 *
 * A Server Component with no interactive state. The visual on the right is
 * built from real DOM elements rather than an image, so it stays crisp at any
 * size, needs no asset, and can never show a broken external URL.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b bg-brand-surface">
      {/* Restrained 1px grid, masked to fade out. Decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]"
      />

      <div className="container-page relative grid gap-12 py-14 sm:py-18 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
        <div className="max-w-xl">
          <Badge variant="secondary" className="gap-1.5 py-1 pr-3">
            <span
              className="size-1.5 rounded-full bg-brand-emerald"
              aria-hidden="true"
            />
            Intelligent tutor matching for Nigeria
          </Badge>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.06]">
            Find the right tutor.
            <span className="block text-brand-emerald-deep">
              Learn with confidence.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
            Discover tutors who match your goals, schedule, location, and budget
            &mdash; all in one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-6 text-base" asChild>
              <Link href={ROUTES.findTutors}>
                Find a Tutor
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
              asChild
            >
              <Link href={ROUTES.register}>Become a Tutor</Link>
            </Button>
          </div>

          <ul className="mt-8 space-y-2.5 text-sm text-muted-foreground">
            {trustPoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-brand-emerald-deep"
                  aria-hidden="true"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Match preview: request in, structured criteria out. */}
        <Card className="shadow-sm">
          <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              You describe
            </p>
            <blockquote className="mt-3 text-[0.95rem] leading-relaxed font-medium text-pretty">
              &ldquo;{exampleRequest}&rdquo;
            </blockquote>

            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <ArrowRight className="size-4 shrink-0 text-brand-emerald-deep" />
              <span className="h-px flex-1 bg-border" />
            </div>

            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              We match on
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
              {derivedCriteria.map((criterion) => (
                <div key={criterion.label}>
                  <dt className="text-xs text-muted-foreground">
                    {criterion.label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold">
                    {criterion.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              Every rate, rating and free slot shown to you comes from our
              database &mdash; never generated by a language model.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
