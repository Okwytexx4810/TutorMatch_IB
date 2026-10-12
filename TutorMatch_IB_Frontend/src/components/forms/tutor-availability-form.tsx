"use client";

import { Loader2, Save } from "lucide-react";
import { useActionState } from "react";

import { saveTutorAvailabilityAction } from "@/app/tutor/actions";
import { AuthFormAlert } from "@/components/forms/auth-form-alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { initialAuthFormState } from "@/lib/auth/action-state";
import {
  DAY_PERIODS,
  WEEK_DAYS,
  type AvailabilitySlot,
  type DayPeriod,
  type WeekDay,
} from "@/types/domain";

const DAY_LABELS: Record<WeekDay, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const PERIOD_LABELS: Record<DayPeriod, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/**
 * Weekly availability editor.
 *
 * A grid of day × period checkboxes. Each ticked cell submits one `slot` value
 * (`day|period`); the server reconciles `tutor_availability` to exactly that
 * set. Uncontrolled checkboxes seeded from the stored slots, so the browser
 * keeps the user's choices across the save refresh.
 */
export function TutorAvailabilityForm({
  slots,
}: {
  slots: AvailabilitySlot[];
}) {
  const [state, formAction, isPending] = useActionState(
    saveTutorAvailabilityAction,
    initialAuthFormState,
  );

  const selected = new Set(slots.map((slot) => `${slot.day}|${slot.period}`));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly availability</CardTitle>
        <CardDescription>
          Tick every day and time block you can teach. Students match against
          these slots.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-5">
          <AuthFormAlert state={state} />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th scope="col" className="w-24" />
                  {WEEK_DAYS.map((day) => (
                    <th
                      key={day}
                      scope="col"
                      className="px-2 pb-2 text-center font-medium text-muted-foreground"
                    >
                      {DAY_LABELS[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAY_PERIODS.map((period) => (
                  <tr key={period}>
                    <th
                      scope="row"
                      className="py-2 pr-3 text-left font-medium text-muted-foreground"
                    >
                      {PERIOD_LABELS[period]}
                    </th>
                    {WEEK_DAYS.map((day) => {
                      const value = `${day}|${period}`;
                      return (
                        <td key={value} className="border-t border-border text-center">
                          <label className="flex cursor-pointer items-center justify-center p-3">
                            <input
                              type="checkbox"
                              name="slot"
                              value={value}
                              defaultChecked={selected.has(value)}
                              className="size-4 accent-brand-emerald-deep"
                            />
                            <span className="sr-only">
                              {DAY_LABELS[day]} {PERIOD_LABELS[period]}
                            </span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <FieldDescription>
            Leave every box clear if you are not taking new students right now.
          </FieldDescription>

          <Button type="submit" className="w-fit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving availability
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden="true" />
                Save availability
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
