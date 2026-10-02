import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { publicNavLinks, ROUTES, siteConfig } from "@/lib/site-config";

const footerSections = [
  {
    title: "For students and parents",
    links: [
      { href: ROUTES.findTutors, label: "Find a tutor" },
      { href: ROUTES.dashboardFindTutor, label: "Describe your needs" },
      { href: ROUTES.dashboardBookings, label: "My bookings" },
    ],
  },
  {
    title: "For tutors",
    links: [
      { href: ROUTES.tutorDashboard, label: "Tutor dashboard" },
      { href: ROUTES.tutorProfileSettings, label: "Create a profile" },
      { href: ROUTES.tutorAvailability, label: "Set availability" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: ROUTES.login, label: "Log in" },
      { href: ROUTES.register, label: "Create an account" },
      { href: ROUTES.dashboardProfile, label: "Profile settings" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t bg-brand-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {siteConfig.description}
          </p>
          <nav aria-label="Footer" className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {footerSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-semibold">{section.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
            reserved.
          </p>
          <p>
            Built for students, parents and tutors across Nigeria.
          </p>
        </div>
      </div>
    </footer>
  );
}
