import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ROUTES, siteConfig } from "@/lib/site-config";

const footerSections = [
  {
    title: "Product",
    links: [
      { href: ROUTES.findTutors, label: "Find Tutors" },
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/#for-tutors", label: "For Tutors" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: ROUTES.about, label: "About" },
      { href: ROUTES.contact, label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: ROUTES.privacy, label: "Privacy" },
      { href: ROUTES.terms, label: "Terms" },
    ],
  },
] as const;

const linkClass =
  "text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-6">
        <div className="md:col-span-2 lg:col-span-3">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {siteConfig.description}
          </p>
          <Button size="sm" variant="outline" className="mt-6" asChild>
            <Link href={ROUTES.findTutors}>Find a tutor</Link>
          </Button>
        </div>

        {footerSections.map((section) => (
          <nav key={section.title} aria-label={section.title}>
            <h2 className="text-sm font-semibold">{section.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t">
        <div className="container-page flex flex-col gap-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </p>
          <nav aria-label="Footer utility" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href={ROUTES.contact} className={linkClass}>
              {siteConfig.contactEmail}
            </Link>
            <Link href="/#how-it-works" className={linkClass}>
              How matching works
            </Link>
          </nav>
        </div>
        <div className="container-page pb-8">
          <p className="text-xs leading-relaxed text-muted-foreground/80">
            Preview build. Tutor profiles and platform figures shown on this
            site are sample content, and the privacy and terms pages are
            placeholders pending legal review.
          </p>
        </div>
      </div>
    </footer>
  );
}
