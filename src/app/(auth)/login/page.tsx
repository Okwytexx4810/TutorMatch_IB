import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your TutorMatch IB account.",
};

export default function LoginPage() {
  return (
    <PagePlaceholder
      phase="Phase 3 &mdash; Authentication"
      title="Welcome back"
      description="Supabase Auth email and password sign-in lands here."
      features={[
        "Email and password sign in",
        "Password reset email",
        "Role-aware redirect after login",
        "Inline validation errors",
      ]}
      action={{ href: ROUTES.register, label: "Create an account" }}
    />
  );
}
