"use client";

import { Check, Loader2, X } from "lucide-react";
import { useActionState } from "react";

import { respondToRequestAction } from "@/app/tutor/actions";
import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { Button } from "@/components/ui/button";
import { initialAuthFormState } from "@/lib/auth/action-state";

/**
 * Accept / decline both submit the same action; the clicked button sets the
 * `intent` field, which the action maps to the `accepted` / `declined` status.
 * One `useActionState` therefore covers both buttons and their pending state.
 */
export function RespondToRequestButtons({ requestId }: { requestId: string }) {
  const [state, formAction, isPending] = useActionState(
    respondToRequestAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <AuthFormAlert state={state} />
      <div className="flex flex-wrap gap-2">
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
      </div>
    </form>
  );
}