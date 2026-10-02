import {
  BadgeCheck,
  BriefcaseBusiness,
  MapPin,
  Star,
} from "lucide-react";
import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/utils/format";
import type { TutorSummary } from "@/types/tutor";

/** Initials for the avatar fallback. Tutor photos come from Storage in Phase 4. */
function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Reusable tutor summary card.
 *
 * Typed against `TutorSummary`, so it renders mock data today and a Supabase
 * query result unchanged once the database exists. `matchScore` is optional
 * because unranked browse results have no score yet; the deterministic engine
 * is the only thing allowed to supply one.
 */
export function TutorCard({
  tutor,
  matchScore,
  className,
}: {
  tutor: TutorSummary;
  matchScore?: number;
  className?: string;
}) {
  const rating =
    typeof tutor.averageRating === "number"
      ? tutor.averageRating.toFixed(1)
      : null;

  const visibleSubjects = tutor.subjects.slice(0, 3);
  const hiddenSubjectCount = tutor.subjects.length - visibleSubjects.length;

  return (
    <Card
      className={cn(
        "gap-0 py-0 transition-shadow duration-200 hover:shadow-md",
        className,
      )}
    >
      <CardHeader className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <Avatar size="lg" className="size-12">
            <AvatarFallback className="bg-brand-navy-deep font-medium text-primary-foreground">
              {initialsOf(tutor.fullName)}
            </AvatarFallback>
          </Avatar>

          {typeof matchScore === "number" ? (
            <Badge
              variant="outline"
              className="border-brand-emerald/45 bg-accent text-accent-foreground"
            >
              {matchScore}% match
            </Badge>
          ) : null}
        </div>

        <div>
          <CardTitle className="flex items-center gap-1.5 text-base">
            {tutor.fullName}
            {tutor.isVerified ? (
              <span className="inline-flex items-center" title="Verified tutor">
                <BadgeCheck
                  className="size-4 shrink-0 text-brand-emerald-deep"
                  aria-hidden="true"
                />
                <span className="sr-only">Verified tutor</span>
              </span>
            ) : null}
          </CardTitle>

          {tutor.headline ? (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {tutor.headline}
            </p>
          ) : null}
        </div>

        {visibleSubjects.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {visibleSubjects.map((subject) => (
              <li key={subject}>
                <Badge variant="secondary">{subject}</Badge>
              </li>
            ))}
            {hiddenSubjectCount > 0 ? (
              <li>
                <Badge variant="ghost">+{hiddenSubjectCount}</Badge>
              </li>
            ) : null}
          </ul>
        ) : null}
      </CardHeader>

      <CardContent className="grid gap-2 px-5 pb-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Star
            className="size-4 shrink-0 text-brand-emerald-deep"
            aria-hidden="true"
          />
          {rating ? (
            <>
              <span className="font-medium text-foreground">{rating}</span>
              <span>({tutor.reviewCount} reviews)</span>
            </>
          ) : (
            <span>No reviews yet</span>
          )}
        </p>

        <p className="flex items-center gap-2">
          <BriefcaseBusiness className="size-4 shrink-0" aria-hidden="true" />
          {tutor.yearsOfExperience} years of experience
        </p>

        {tutor.location ? (
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {tutor.location}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="justify-between gap-3 py-3">
        <p className="text-sm">
          <span className="font-semibold text-foreground">
            {formatNaira(tutor.hourlyRate)}
          </span>
          <span className="text-muted-foreground">/hr</span>
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link href={ROUTES.tutorProfile(tutor.id)}>View Profile</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
