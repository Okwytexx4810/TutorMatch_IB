import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarCheck,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  description: siteConfig.description,
};

const valueProps = [
  {
    icon: Sparkles,
    title: "Describe it in plain English",
    body: "Tell us the subject, level, area, days that work and your budget. We turn that into a shortlist.",
  },
  {
    icon: ShieldCheck,
    title: "Real data, not guesses",
    body: "Every rate, rating and availability slot on a tutor profile comes from our database, never from a language model.",
  },
  {
    icon: CalendarCheck,
    title: "Request and book in one flow",
    body: "Send a request, get a response from the tutor, and track the confirmed session from your dashboard.",
  },
  {
    icon: Wallet,
    title: "Budget-aware by default",
    body: "Set a ceiling and we only surface tutors who actually teach within it.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="border-b bg-brand-surface">
        <div className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="max-w-xl">
            <Badge variant="secondary" className="mb-5">
              Intelligent tutor matching for Nigeria
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Find the right tutor, faster.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
              Tell us what you need in your own words. TutorMatch IB matches you
              with tutors by subject, level, location, availability, budget and
              experience &mdash; then lets you request and book a session
              directly.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={ROUTES.findTutors}>
                  Find a tutor
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={ROUTES.register}>Create an account</Link>
              </Button>
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden="true" />
              Built for in-person and online tutoring across Nigeria.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              You say
            </p>
            <blockquote className="mt-2 text-lg leading-relaxed font-medium text-pretty">
              &ldquo;I need a patient Mathematics tutor for WAEC preparation. My
              daughter is available Tuesday and Thursday evenings and we prefer
              someone around Bodija. Our budget is around &#8358;7,000 per
              lesson.&rdquo;
            </blockquote>
            <p className="mt-6 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              You get
            </p>
            <ul className="mt-3 space-y-2.5 text-sm">
              {[
                "Mathematics &middot; WAEC &middot; Bodija",
                "Tuesday & Thursday evenings available",
                "Within your &#8358;7,000 per lesson budget",
                "Ranked by a transparent match score",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-emerald"
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How TutorMatch IB works
          </h2>
          <p className="mt-3 text-muted-foreground">
            One flow for students, parents and tutors.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {valueProps.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <span
                  className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                  aria-hidden="true"
                >
                  <item.icon className="size-5" />
                </span>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-brand-surface">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-16 sm:flex-row sm:items-center">
          <div className="max-w-lg">
            <h2 className="text-2xl font-semibold tracking-tight">
              Are you a tutor?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Publish your subjects, qualifications, rates and availability, and
              receive requests from students who already fit your criteria.
            </p>
          </div>
          <Button asChild>
            <Link href={ROUTES.tutorDashboard}>
              Create a tutor profile
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
