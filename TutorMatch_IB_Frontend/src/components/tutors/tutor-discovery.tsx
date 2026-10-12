import { Search, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { Button } from "@/components/ui/button";
import { TutorCard } from "@/components/tutors/tutor-card";
import { IBADAN_LOCATIONS } from "@/lib/locations";
import { ROUTES } from "@/lib/site-config";
import {
  buildDiscoveryHref,
  discoveryHasFilters,
  DISCOVERY_MAX_RATE,
} from "@/lib/validation/tutor-discovery";
import type { TutorDiscoveryFilters } from "@/lib/validation/tutor-discovery";
import { DAY_PERIODS, EDUCATION_LEVELS, WEEK_DAYS } from "@/types/domain";
import type { TutorDiscoveryResult } from "@/lib/supabase/queries/tutors";

/**
 * Shared discovery UI for the public `/find-tutors` route and the signed-in
 * dashboard equivalent. Both render the same filter-from and the same card
 * grid so behaviour (and filters) never drift between the two entry points.
 *
 * Server components with a plain GET form: no client state, no hydration
 * dependency, and Next.js re-renders the page from `searchParams`. Mirrors the
 * project's no-JavaScript-where-a-form-suffices rule.
 */

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TutorDiscoveryForm({
  subjects,
  filters,
}: {
  subjects: string[];
  filters: TutorDiscoveryFilters;
}) {
  const hasFilters = discoveryHasFilters(filters);

  return (
    <form
      action={ROUTES.findTutors}
      method="get"
      className="mt-8 rounded-xl border bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            defaultValue={filters.subject ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="level-filter"
            className="text-sm font-medium text-foreground"
          >
            Level
          </label>
          <select
            id="level-filter"
            name="level"
            defaultValue={filters.level ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">All levels</option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="location-filter"
            className="text-sm font-medium text-foreground"
          >
            Location
          </label>
          <select
            id="location-filter"
            name="location"
            defaultValue={filters.location ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Anywhere in Ibadan</option>
            {IBADAN_LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-medium text-foreground">
            Budget per hour (₦)
          </span>
          <div className="flex items-center gap-2">
            <input
              id="min-rate"
              name="minRate"
              type="number"
              inputMode="numeric"
              min={0}
              max={DISCOVERY_MAX_RATE}
              placeholder="From"
              defaultValue={filters.minRate ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <span className="text-muted-foreground" aria-hidden="true">
              to
            </span>
            <input
              name="maxRate"
              type="number"
              inputMode="numeric"
              min={0}
              max={DISCOVERY_MAX_RATE}
              placeholder="To"
              defaultValue={filters.maxRate ?? ""}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="day-filter"
            className="text-sm font-medium text-foreground"
          >
            Available on
          </label>
          <select
            id="day-filter"
            name="day"
            defaultValue={filters.day ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Any day</option>
            {WEEK_DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="period-filter"
            className="text-sm font-medium text-foreground"
          >
            Time of day
          </label>
          <select
            id="period-filter"
            name="period"
            defaultValue={filters.period ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Any time</option>
            {DAY_PERIODS.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit">
          <Search className="size-4" aria-hidden="true" />
          Filter tutors
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.findTutors}>Clear filters</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function TutorDiscoveryResults({
  result,
  filters,
}: {
  result: TutorDiscoveryResult;
  filters: TutorDiscoveryFilters;
}) {
  const { tutors, total, page, pageSize, isError } = result;

  if (isError) {
    return (
      <div className="mt-8 space-y-4">
        <ErrorState
          title="We could not load tutors"
          description="Please try again in a moment."
        />
        <Button asChild variant="outline">
          <Link href={ROUTES.findTutors}>Try again</Link>
        </Button>
      </div>
    );
  }

  if (tutors.length === 0) {
    return (
      <div className="mt-8">
        {discoveryHasFilters(filters) ? (
          <EmptyState
            icon={<UserRound className="size-5" aria-hidden="true" />}
            title="No tutors match those filters"
            description="Clear a filter or two, and check back soon as new tutors join."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTES.findTutors}>Clear filters</Link>
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
    );
  }

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < lastPage;
  const href = (target: number) =>
    (ROUTES.findTutors + buildDiscoveryHref(filters, target)) as Route;

  return (
    <section className="mt-8">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "tutor" : "tutors"} available
        {filters.subject ? ` for ${filters.subject}` : ""}
      </p>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tutors.map((tutor) => (
          <li key={tutor.id}>
            <TutorCard tutor={tutor} />
          </li>
        ))}
      </ul>

      <nav
        aria-label="Tutor results pagination"
        className="mt-8 flex items-center justify-between gap-3"
      >
        <Button
          asChild={hasPrevious}
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          aria-disabled={!hasPrevious}
        >
          {hasPrevious ? (
            <Link href={href(page - 1)} rel="prev">
              Previous
            </Link>
          ) : (
            <span>Previous</span>
          )}
        </Button>

        <p className="text-sm text-muted-foreground">
          Page {page} of {lastPage}
        </p>

        <Button
          asChild={hasNext}
          variant="outline"
          size="sm"
          disabled={!hasNext}
          aria-disabled={!hasNext}
        >
          {hasNext ? (
            <Link href={href(page + 1)} rel="next">
              Next
            </Link>
          ) : (
            <span>Next</span>
          )}
        </Button>
      </nav>
    </section>
  );
}