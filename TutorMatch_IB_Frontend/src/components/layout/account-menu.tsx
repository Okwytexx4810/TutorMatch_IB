import Link from "next/link";
import type { Route } from "next";

import { SignOutButton } from "@/components/forms/sign-out-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/** Initials for the avatar fallback, matching the tutor card. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Signed-in account control for the public header.
 *
 * Shows the visitor's own name and an avatar that links straight to the
 * profile for their role (a tutor lands on their tutor profile, a student on
 * their account profile), plus a sign-out control. Rendered only when a
 * session exists; anonymous visitors still get the Log in / Get started pair.
 */
export function AccountMenu({
  name,
  profileHref,
}: {
  name: string;
  profileHref: Route;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={profileHref}
        aria-label={`Open ${name}'s profile`}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar size="sm">
          <AvatarFallback>{initialsOf(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
      </Link>
      <SignOutButton />
    </div>
  );
}
