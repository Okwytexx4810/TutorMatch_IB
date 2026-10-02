"use client"

import { ErrorState } from "@/components/layout/error-state";

/**
 * Last-resort boundary for a failure in the root layout.
 *
 * It must render its own `<html>` and `<body>`, so it cannot import or rely on
 * anything from the root layout.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="container-page py-20">
          <ErrorState
            title="The application failed to load"
            description="A critical error occurred while rendering TutorMatch IB."
            action={{ label: "Reload", onClick: reset }}
          />
        </div>
      </body>
    </html>
  );
}
