import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Placeholder shown on routes that are scaffolded but not yet implemented.
 *
 * Every placeholder names the development phase that delivers it, so a stub is
 * never mistaken for a finished feature during a demo.
 */
export function PagePlaceholder({
  title,
  description,
  phase,
  features,
  action,
}: {
  title: string;
  description: string;
  phase: string;
  features: readonly string[];
  action?: { href: Route; label: string };
}) {
  return (
    <div className="mx-auto w-full max-w-3xl py-10">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold tracking-wider text-brand-emerald-deep uppercase">
            {phase}
          </p>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="grid gap-2.5 text-sm text-muted-foreground sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-emerald"
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 border-t pt-5">
            {action ? (
              <Button asChild size="sm">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
