import type { Metadata } from "next";
import { BookOpen, GraduationCap, Inbox, Users } from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin",
  description: "Platform overview, users, tutors and requests.",
};

const platformStats = [
  { label: "Total users", value: 0, icon: Users },
  { label: "Tutors", value: 0, icon: GraduationCap },
  { label: "Tutor requests", value: 0, icon: Inbox },
  { label: "Bookings", value: 0, icon: BookOpen },
] as const;

export default function AdminPage() {
  return (
    <>
      <DashboardHeader
        title="Admin"
        description="Platform overview and basic statistics."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {platformStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <span
                className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                aria-hidden="true"
              >
                <stat.icon className="size-4" />
              </span>
              <CardTitle className="text-3xl font-semibold tabular-nums">
                {stat.value}
              </CardTitle>
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <PagePlaceholder
          phase="Phase 10 &mdash; Dashboards"
          title="Admin console"
          description="Aggregate counts are computed from real rows, never hard-coded."
          features={[
            "View all users by role",
            "View and verify tutors",
            "View students and parents",
            "View all tutor requests",
            "Basic platform statistics",
          ]}
        />
      </div>
    </>
  );
}
