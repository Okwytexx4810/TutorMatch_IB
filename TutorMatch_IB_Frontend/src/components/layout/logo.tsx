import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Brand mark. Kept as an inline component rather than an image so it inherits
 * currentColor and stays crisp at every size.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
    >
      <span
        className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <GraduationCap className="size-5" />
      </span>
      {showWordmark ? (
        <span className="text-base">
          TutorMatch <span className="text-brand-emerald-deep">IB</span>
        </span>
      ) : null}
      <span className="sr-only">TutorMatch IB home</span>
    </Link>
  );
}
