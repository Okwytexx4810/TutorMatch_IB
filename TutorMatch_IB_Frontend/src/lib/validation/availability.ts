import { z } from "zod";

import { DAY_PERIODS, WEEK_DAYS } from "@/types/domain";

/**
 * Validation for a tutor's weekly availability.
 *
 * A slot is a day + period pair, matching the `tutor_availability` table's
 * (day, period) identity and the vocabulary the request form and matching
 * engine already use. The array is capped at the full grid so a crafted body
 * cannot ask the server to write an unbounded number of rows.
 */
export const availabilitySlotSchema = z.object({
  day: z.enum(WEEK_DAYS, { error: "Choose a valid day." }),
  period: z.enum(DAY_PERIODS, { error: "Choose a valid time of day." }),
});

export type AvailabilitySlotInput = z.infer<typeof availabilitySlotSchema>;

export const tutorAvailabilitySchema = z.object({
  slots: z
    .array(availabilitySlotSchema)
    .max(
      WEEK_DAYS.length * DAY_PERIODS.length,
      "That is more slots than the week has.",
    ),
});

export type TutorAvailabilityInput = z.infer<typeof tutorAvailabilitySchema>;
