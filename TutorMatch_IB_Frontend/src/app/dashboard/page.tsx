import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Inbox, Search } from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track your tutor requests and upcoming bookings.",
};

const overviewStats = [
  { label: "Pending requests", value: 0, icon: Inbox },
  { label: "Confirmed bookings", value: 0, icon: CalendarPlus },
  { label: "Tutors shortlisted", value: 0, icon: Search },
] as const;

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Your tutor requests, bookings and upcoming sessions."
        actions={
          <Button asChild size="sm">
            <Link href={ROUTES.findTutors}>
              <Search className="size-4" aria-hidden="true" />
              Find a tutor
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-3">
        {overviewStats.map((stat) => (
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

      <EmptyState
        className="mt-8"
        title="No requests yet"
        description="Describe what you need and we will shortlist tutors who match your subject, location, availability and budget."
        action={
          <Button asChild size="sm">
            <Link href={ROUTES.findTutors}>Describe your needs</Link>
          </Button>
        }
      />
    </>
  );
}
