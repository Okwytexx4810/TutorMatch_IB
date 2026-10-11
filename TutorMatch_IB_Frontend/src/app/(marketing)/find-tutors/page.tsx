import type { Metadata } from "next";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { Button } from "@/components/ui/button";
import { TutorCard } from "@/components/tutors/tutor-card";
import { getProfile, getUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/site-config";
import { getTutorSummaries } from "@/lib/supabase/queries/tutors";
import { normalize } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Find tutors",
  description:
    "Browse available tutors by subject, location, budget, availability and experience.",
};

/** Public discovery route: never requires sign-in, reads through RLS. */
export const dynamic = "force-dynamic";

export default async function FindTutorsPage({
  searchParams,
}: PageProps<"/find-tutors">) {
  const params = await searchParams;
  const requestedSubject =
    typeof params.subject === "string" ? params.subject.trim() : "";

  const [result, user] = await Promise.all([
    getTutorSummaries({ subject: requestedSubject || undefined }),
    getUser(),
  ]);

  const profile = user ? await getProfile() : null;

  const activeSubject = result.subjects.find(
    (subject) => normalize(subject) === normalize(requestedSubject),
  );

  return (
    <div className="container-page py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Find tutors</h1>
        <p className="mt-2 text-muted-foreground">
          Browse tutors by subject and pick someone who fits your location,
          schedule and budget.
        </p>
      </header>

      <form
        action={ROUTES.findTutors}
        method="get"
        className="mt-8 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      >
        <div className="grid gap-1.5">
          <label
            htmlFor="subject-filter"
            className="text-sm font-medium text-foreground"
          >
            Subject
          </label>
          <select
            id="subject-filter"
            name="subject"
            defaultValue={activeSubject ?? ""}
            className="h-9 min-w-52 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All subjects</option>
            {result.subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit">
          <Search className="size-4" aria-hidden="true" />
          Filter tutors
        </Button>

        {activeSubject ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.findTutors}>Clear filter</Link>
          </Button>
        ) : null}
      </form>

      {result.isError ? (
        <div className="mt-8 space-y-4">
          <ErrorState
            title="We could not load tutors"
            description="Please try again in a moment."
          />
          <Button asChild variant="outline">
            <Link href={ROUTES.findTutors}>Try again</Link>
          </Button>
        </div>
      ) : null}

      {!result.isError && result.tutors.length === 0 ? (
        <div className="mt-8">
          {activeSubject ? (
            <EmptyState
              icon={<UserRound className="size-5" aria-hidden="true" />}
              title={`No tutors teach ${activeSubject} yet`}
              description="Try a different subject, or check back soon as new tutors join."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={ROUTES.findTutors}>Browse all tutors</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<UserRound className="size-5" aria-hidden="true" />}
              title="No tutors are available yet"
              description="Tutor profiles will appear here as soon as tutors create them."
            />
          )}
        </div>
      ) : null}

      {!result.isError && result.tutors.length > 0 ? (
        <section className="mt-8">
          <p className="text-sm text-muted-foreground">
            {result.tutors.length}{" "}
            {result.tutors.length === 1 ? "tutor" : "tutors"} available
            {activeSubject ? ` for ${activeSubject}` : ""}
          </p>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.tutors.map((tutor) => (
              <li key={tutor.id}>
                <TutorCard tutor={tutor} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12 flex flex-col items-start gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {user
              ? "Found someone? Continue from your dashboard"
              : "Ready to find your match?"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {user
              ? "Your dashboard keeps your shortlist, requests and bookings in one place."
              : "Sign in to shortlist a tutor and send a request once you have chosen."}
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