"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

function SignOutButtonContent() {
  const { pending } = useFormStatus();

  return (
    <>
      <LogOut className="size-4" aria-hidden="true" />
      {pending ? "Signing out" : "Sign out"}
    </>
  );
}

/**
 * Sign-out control, shared by the student, tutor and admin dashboards.
 *
 * A form posting to a Server Action rather than a client-side `signOut()` call,
 * so the Supabase session is revoked on the server and the refreshed cookies
 * are written before the redirect.
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm">
        <SignOutButtonContent />
      </Button>
    </form>
  );
}
