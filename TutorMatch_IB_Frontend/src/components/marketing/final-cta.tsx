import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/site-config";

export function FinalCta() {
  return (
    <section className="bg-brand-navy-deep">
      <div className="container-page py-16 text-center lg:py-24">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl lg:text-[2.75rem]">
          Your next great learning experience starts here.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70 text-pretty">
          Tell us what you need, or publish what you teach. Either way, you
          start with a shortlist rather than a search box.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-12 bg-white px-6 text-base text-brand-navy-deep hover:bg-white/90"
            asChild
          >
            <Link href={ROUTES.findTutors}>
              Find a Tutor
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-white/25 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href={ROUTES.register}>Join as a Tutor</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
