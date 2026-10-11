import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/site-config";

const tutorCapabilities = [
  "Create a tutor profile in a few minutes",
  "Showcase your subjects and qualifications",
  "Set your own rates and availability",
  "Receive requests from students who already fit your criteria",
] as const;

export function ForTutors() {
  return (
    <section id="for-tutors" className="scroll-mt-20 border-y bg-brand-surface">
      <div className="container-page py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-semibold tracking-wider text-brand-emerald-deep uppercase">
              For tutors
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Share your expertise with students who need it.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
              Stop waiting for parents to find you by word of mouth. Publish
              what you teach, set the times you actually work, and let matching
              bring you students who fit.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-6 text-base" asChild>
                <Link href={ROUTES.register}>
                  Become a Tutor
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 text-base"
                asChild
              >
                <Link href={ROUTES.tutorProfileSettings}>
                  See the tutor profile
                </Link>
              </Button>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardContent className="px-6 py-6 sm:px-7 sm:py-7">
              <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                On TutorMatch IB you can
              </h3>
              <ul className="mt-5 space-y-4">
                {tutorCapabilities.map((capability) => (
                  <li key={capability} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
                      aria-hidden="true"
                    >
                      <Check className="size-3.5" />
                    </span>
                    <span className="leading-relaxed">{capability}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
