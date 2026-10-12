"use client";

import { Check, Loader2, X } from "lucide-react";
import { useActionState } from "react";

import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import type { EngagementAction } from "@/components/bookings/schedule-booking-form";
import { Button } from "@/components/ui/button";
import { initialAuthFormState } from "@/lib/auth/action-state";

export interface BookingActionIntent {
  /** Value submitted for the `intent` field; the action maps it to a status. */
  intent: string;
  label: string;
  /** `complete` reads as the affirmative action, `cancel` as a quiet one. */
  variant?: "default" | "outline" | "destructive";
  icon?: "check" | "x";
}

/**
 * Status-changing buttons for one booking. Each button submits the same action
 * with its own `intent`, so a page can offer e.g. cancel + complete through a
 * single `useActionState` and a single pending state.
 */
export function BookingActions({
  bookingId,
  action,
  intents,
}: {
  bookingId: string;
  action: EngagementAction;
  intents: BookingActionIntent[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <AuthFormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        {intents.map((item) => {
          const Icon = item.icon === "check" ? Check : X;
          return (
            <Button
              key={item.intent}
              type="submit"
              name="intent"
              value={item.intent}
              variant={item.variant ?? "default"}
              size="sm"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Icon className="size-4" aria-hidden="true" />
              )}
              {item.label}
            </Button>
          );
        })}
      </div>
    </form>
  );
}