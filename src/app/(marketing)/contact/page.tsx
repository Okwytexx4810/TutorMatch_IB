import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the TutorMatch IB team.",
};

export default function ContactPage() {
  return (
    <div className="container-page py-10">
      <PagePlaceholder
        phase="Phase 2 &mdash; Content"
        title="Contact us"
        description="Support for students and parents, and a route for tutors who want to join."
        features={[
          "Support email address",
          "Response time expectations",
          "Tutor onboarding enquiries",
          "Partnership and press enquiries",
        ]}
        action={{ href: ROUTES.register, label: "Create an account" }}
      />
    </div>
  );
}
