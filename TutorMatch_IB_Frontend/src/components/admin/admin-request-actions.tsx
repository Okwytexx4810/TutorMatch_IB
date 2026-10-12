"use client";

import { Check, Loader2, X, XCircle } from "lucide-react";
import { useActionState } from "react";

import { manageRequestAction } from "@/app/admin/actions";
import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { Button } from "@/components/ui/button";
import { initialAuthFormState } from "@/lib/auth/action-state";
import type { RequestStatus } from "@/types/engagement";

/**
 * Administrator controls for one application.
 *
 * One `useActionState` covers every button: the clicked button's `intent` field
 * is what selects the status, so their pending state stays in sync.
 *
 * - Pending: accept, decline or close.
 * - Accepted: close (cancel) only.
 * - Declined / cancelled: terminal, so nothing is rendered.
 */
export function AdminRequestActions({
  requestId,
  status,
}: {
  requestId: string;
  status: RequestStatus;
}) {
  const [state, formAction, isPending] = useActionState(
    manageRequestAction,
    initialAuthFormState,
  );

  if (status === "declined" || status === "cancelled") return null;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <AuthFormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        {status === "pending" ? (
          <>
            <Button type="submit" name="intent" value="accept" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Accept
            </Button>
            <Button
              type="submit"
              name="intent"
              value="decline"
              variant="outline"
              disabled={isPending}
            >
              <X className="size-4" aria-hidden="true" />
              Decline
            </Button>
          </>
        ) : null}
        <Button
          type="submit"
          name="intent"
          value="cancel"
          variant="ghost"
          disabled={isPending}
        >
          <XCircle className="size-4" aria-hidden="true" />
          Close
        </Button>
      </div>
    </form>
  );
}
