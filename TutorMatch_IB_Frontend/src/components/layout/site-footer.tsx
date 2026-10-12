import { Globe, Mail, Phone } from "lucide-react";
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
    title: "Get Started",
    links: [
      { href: ROUTES.register, label: "Create Account" },
      { href: ROUTES.login, label: "Sign In" },
      { href: ROUTES.dashboard, label: "Student Area" },
      { href: ROUTES.tutorDashboard, label: "Tutor Area" },
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
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-12">
        <div className="max-w-sm space-y-5 lg:col-span-4">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {siteConfig.description}
          </p>
          <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="inline-flex w-fit items-center gap-2 transition-colors hover:text-foreground"
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              {siteConfig.contactEmail}
            </a>
            <a
              href={`tel:${siteConfig.contactPhone.replace(/[^+\d]/g, "")}`}
              className="inline-flex w-fit items-center gap-2 transition-colors hover:text-foreground"
            >
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              {siteConfig.contactPhone}
            </a>
            <a
              href={siteConfig.url}
              className="inline-flex w-fit items-center gap-2 transition-colors hover:text-foreground"
            >
              <Globe className="size-4 shrink-0" aria-hidden="true" />
              {siteConfig.url.replace(/^https?:\/\//, "")}
            </a>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={ROUTES.findTutors}>Find a tutor</Link>
          </Button>
        </div>

        {footerSections.map((section) => (
          <nav key={section.title} aria-label={section.title} className="lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              {section.title}
            </h2>
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
            &copy; {new Date().getFullYear()} {siteConfig.name}. Built for
            learners in Ibadan.
          </p>
          <nav aria-label="Footer utility" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href={ROUTES.privacy} className={linkClass}>
              Privacy
            </Link>
            <Link href={ROUTES.terms} className={linkClass}>
              Terms
            </Link>
            <Link href={ROUTES.contact} className={linkClass}>
              Contact
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