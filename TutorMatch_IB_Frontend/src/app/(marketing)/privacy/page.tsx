import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Placeholder. TutorMatch IB does not yet publish a final privacy policy.",
};

export default function PrivacyPage() {
  return (
    <div className="container-page py-10">
      <PagePlaceholder
        phase="Placeholder &mdash; not legal advice"
        title="Privacy policy"
        description="No policy is published yet. Nothing on this page should be relied on as a commitment about how data is handled."
        features={[
          "What is collected and why",
          "Supabase Auth and Storage roles",
          "Retention and deletion requests",
          "Contact for data questions",
          "NDPR and GDPR readiness review",
        ]}
        action={{ href: ROUTES.contact, label: "Contact us" }}
      />
    </div>
  );
}
