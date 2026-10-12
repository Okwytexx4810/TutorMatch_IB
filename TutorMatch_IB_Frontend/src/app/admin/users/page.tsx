import type { Metadata } from "next";
import { Mail, MapPin, Phone, Users } from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/layout/empty-state";
import { ErrorState } from "@/components/layout/error-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/site-config";
import { getAdminUsers } from "@/lib/supabase/queries/admin";
import type { UserRole } from "@/types/domain";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Users",
  description: "Every account and its role.",
};

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  parent: "Parent",
  tutor: "Tutor",
  admin: "Admin",
};

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  student: "secondary",
  parent: "secondary",
  tutor: "default",
  admin: "outline",
};

export default async function AdminUsersPage() {
  await requireRole(["admin"], ROUTES.adminUsers);

  const { users, isError } = await getAdminUsers();

  const counts = users.reduce<Record<string, number>>((accumulator, user) => {
    accumulator[user.role] = (accumulator[user.role] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <>
      <DashboardHeader
        title="Users"
        description="Every registered account, newest first."
      />

      <div className="grid gap-4 p-4 sm:p-6">
        {isError ? (
          <ErrorState
            title="We could not load users"
            description="Please refresh the page to try again."
          />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" aria-hidden="true" />}
            title="No users yet"
            description="Registered accounts will appear here."
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                <Badge key={role} variant={ROLE_VARIANT[role]}>
                  {ROLE_LABELS[role]}: {counts[role] ?? 0}
                </Badge>
              ))}
            </div>

            <ul className="grid gap-3">
              {users.map((user) => (
                <li key={user.id}>
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">
                          {user.fullName}
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Joined {formatDate(user.createdAt)}
                        </p>
                      </div>
                      <Badge variant={ROLE_VARIANT[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Mail className="size-4 shrink-0" aria-hidden="true" />
                        <a
                          href={`mailto:${user.email}`}
                          className="truncate underline-offset-4 hover:underline"
                        >
                          {user.email}
                        </a>
                      </span>
                      {user.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-4" aria-hidden="true" />
                          {user.phone}
                        </span>
                      ) : null}
                      {user.location ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-4" aria-hidden="true" />
                          {user.location}
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
