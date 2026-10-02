import { cn } from "@/lib/utils";

/**
 * Shared section header for the marketing page.
 *
 * Used by six sections, so the eyebrow / heading / supporting copy rhythm is
 * defined once rather than repeated with slightly different spacing each time.
 * The heading is always an `h2`; the page owns the single `h1`.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-wider text-brand-emerald-deep uppercase">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
    </div>
  );
}
