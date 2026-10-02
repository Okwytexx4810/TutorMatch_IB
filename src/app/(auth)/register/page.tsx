import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Register as a student, parent or tutor on TutorMatch IB.",
};

export default function RegisterPage() {
  return (
    <PagePlaceholder
      phase="Phase 3 &mdash; Authentication"
      title="Create your account"
      description="Registration via Supabase Auth, with the role that determines the onboarding path."
      features={[
        "Sign up as student, parent or tutor",
        "Supabase Auth session cookie",
        "Role stored on the profile row",
        "Onboarding handoff to tutor onboarding",
      ]}
      action={{ href: ROUTES.login, label: "I already have an account" }}
    />
  );
}
