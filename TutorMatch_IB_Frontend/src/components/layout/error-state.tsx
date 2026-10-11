import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Standard inline error state for a failed operation that the user can retry.
 *
 * `error.tsx` handles unexpected render errors; this component handles the
 * expected, recoverable failures returned by a server action or route handler.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We could not complete that request. Please try again.",
  action,
}: {
  title?: string;
  description?: string;
  action?: { label: string; onClick?: () => void };
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <span
        className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
        aria-hidden="true"
      >
        <TriangleAlert className="size-5" />
      </span>
      <div>
        <p className="font-medium text-destructive">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <Button size="sm" onClick={action.onClick}>{action.label}</Button> : null}
    </div>
  );
}
