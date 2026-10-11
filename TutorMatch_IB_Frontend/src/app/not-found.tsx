import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span
        className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"
        aria-hidden="true"
      >
        <Compass className="size-6" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/find-tutors">Find a tutor</Link>
        </Button>
      </div>
    </div>
  );
}
