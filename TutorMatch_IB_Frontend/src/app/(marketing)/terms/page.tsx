import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Placeholder. TutorMatch IB does not yet publish final terms of service.",
};

export default function TermsPage() {
  return (
    <div className="container-page py-10">
      <PagePlaceholder
        phase="Placeholder &mdash; not legal advice"
        title="Terms of service"
        description="No terms are published yet. Booking, payment and conduct rules are still to be agreed."
        features={[
          "Account responsibilities",
          "Booking and cancellation rules",
          "Payment and fee handling",
          "Tutor and student conduct",
          "Liability and dispute resolution",
        ]}
        action={{ href: ROUTES.contact, label: "Contact us" }}
      />
    </div>
  );
}
