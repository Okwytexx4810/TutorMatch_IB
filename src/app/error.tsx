"use client"

import { useEffect } from "react";

import { ErrorState } from "@/components/layout/error-state";

/**
 * Route-level error boundary.
 *
 * Renders when a page or layout throws. It is a Client Component because it
 * needs `reset` to re-render the subtree.
 *
 * `digest` is the only value safe to show a user; the real error stays in the
 * server logs.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[tutormatch] route error", error);
  }, [error]);

  return (
    <div className="container-page py-20">
      <ErrorState
        title="This page could not be loaded"
        description="An unexpected error occurred. Trying again usually resolves it."
        action={{ label: "Try again", onClick: reset }}
      />
      {error.digest ? (
        <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
