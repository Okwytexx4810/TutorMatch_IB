import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  TutorDiscoveryForm,
  TutorDiscoveryResults,
} from "@/components/tutors/tutor-discovery";
import { getProfile, getUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/site-config";
import { getTutorSummaries } from "@/lib/supabase/queries/tutors";
import { parseTutorDiscoverySearchParams } from "@/lib/validation/tutor-discovery";

export const metadata: Metadata = {
  title: "Find tutors",
  description:
    "Browse available tutors by subject, level, location, budget and availability.",
};

/** Public discovery route: never requires sign-in, reads through RLS. */
export const dynamic = "force-dynamic";

export default async function FindTutorsPage({
  searchParams,
}: PageProps<"/find-tutors">) {
  const params = await searchParams;
  const search = parseTutorDiscoverySearchParams(params);

  const [result, user] = await Promise.all([
    getTutorSummaries(search),
    getUser(),
  ]);

  const profile = user ? await getProfile() : null;

  return (
    <div className="container-page py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Find tutors</h1>
        <p className="mt-2 text-muted-foreground">
          Browse tutors and pick someone who fits your subject, location,
          schedule and budget.
        </p>
      </header>

      <TutorDiscoveryForm subjects={result.subjects} filters={search.filters} />

      <TutorDiscoveryResults result={result} filters={search.filters} />

      <section className="mt-12 flex flex-col items-start gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {user
              ? "Found someone? Continue from your dashboard"
              : "Ready to find your match?"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {user
              ? "Your dashboard keeps your requests and bookings in one place."
              : "Sign in to send a tutor a request once you have chosen."}
          </p>
        </div>
        {user ? (
          <Button asChild>
            <Link href={homeForRole(profile?.role ?? null)}>
              Open your dashboard
            </Link>
          </Button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link
                href={`${ROUTES.login}?next=${encodeURIComponent(ROUTES.findTutors)}`}
              >
                Sign in
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={ROUTES.register}>Create an account</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}