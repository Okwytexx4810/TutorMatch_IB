"use client";

import { Loader2, X } from "lucide-react";
import { useActionState } from "react";

import { cancelRequesterRequestAction } from "@/app/dashboard/actions";
import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { Button } from "@/components/ui/button";
import { initialAuthFormState } from "@/lib/auth/action-state";

/** Withdraw a pending request. Only rendered while the request is pending. */
export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [state, formAction, isPending] = useActionState(
    cancelRequesterRequestAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <AuthFormAlert state={state} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <X className="size-4" aria-hidden="true" />
        )}
        Cancel request
      </Button>
    </form>
  );
}