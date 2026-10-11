import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/site-config";

/**
 * Natural-language tutor request field.
 *
 * Presentational only: nothing is sent to OpenAI. It is a plain GET form, so it
 * works with zero client JavaScript and degrades to the Phase 6 filter page
 * while the matching engine is still being built. Phase 8 replaces the plain
 * form post with the extraction endpoint.
 */
export function TutorRequestSearch() {
  return (
    <section className="border-b bg-background">
      <div className="container-page py-12 lg:py-16">
        <Card className="shadow-sm">
          <CardContent className="px-5 py-6 sm:px-8 sm:py-8">
            <form action={ROUTES.findTutors} method="get">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label
                  htmlFor="tutor-request"
                  className="text-lg font-semibold tracking-tight"
                >
                  What kind of tutor are you looking for?
                </label>
                <Badge variant="outline" className="gap-1.5">
                  <Sparkles className="size-3.5 text-brand-emerald-deep" aria-hidden="true" />
                  Preview
                </Badge>
              </div>

              <Textarea
                id="tutor-request"
                name="q"
                rows={3}
                aria-describedby="tutor-request-help"
                placeholder="I need a Mathematics tutor for WAEC preparation..."
                className="mt-3 min-h-24 resize-y text-base"
              />

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p
                  id="tutor-request-help"
                  className="max-w-md text-sm text-muted-foreground"
                >
                  Describe what you need in your own words. We&apos;ll help you
                  find suitable tutors.
                </p>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 shrink-0 px-5 text-base"
                >
                  Find My Match
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
