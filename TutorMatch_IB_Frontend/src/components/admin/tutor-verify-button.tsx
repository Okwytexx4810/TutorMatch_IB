"use client";

import { BadgeCheck, Loader2, ShieldOff } from "lucide-react";
import { useActionState } from "react";

import { setTutorVerifiedAction } from "@/app/admin/actions";
import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { Button } from "@/components/ui/button";
import { initialAuthFormState } from "@/lib/auth/action-state";

/**
 * Verify / unverify a tutor. The clicked button's `intent` value selects the
 * target state; the SECURITY DEFINER function behind the action re-checks the
 * administrator role in the database.
 */
export function TutorVerifyButton({
  tutorId,
  isVerified,
}: {
  tutorId: string;
  isVerified: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    setTutorVerifiedAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="tutorId" value={tutorId} />
      <input
        type="hidden"
        name="intent"
        value={isVerified ? "unverify" : "verify"}
      />
      <AuthFormAlert state={state} />
      <Button
        type="submit"
        size="sm"
        variant={isVerified ? "outline" : "default"}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : isVerified ? (
          <ShieldOff className="size-4" aria-hidden="true" />
        ) : (
          <BadgeCheck className="size-4" aria-hidden="true" />
        )}
        {isVerified ? "Unverify" : "Verify"}
      </Button>
    </form>
  );
}
