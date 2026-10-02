import { z } from "zod";

import {
  DAY_PERIODS,
  EDUCATION_LEVELS,
  TEACHING_MODES,
  WEEK_DAYS,
} from "@/types/domain";

/**
 * Zod schemas for every external or user-supplied payload.
 *
 * This is the trust boundary. Route handlers and server actions parse input
 * here before it reaches the database, the matching engine or OpenAI, so an
 * unvalidated body can never travel further inwards.
 */

export const availabilitySlotSchema = z.object({
  day: z.enum(WEEK_DAYS),
  period: z.enum(DAY_PERIODS),
});

/**
 * The structured tutoring requirements shared by the AI extraction step and
 * the matching engine.
 *
 * Every field is optional: a student may describe only some of what they need,
 * and an unconstrained field must not penalise a tutor.
 */
export const matchingRequirementsSchema = z.object({
  subject: z.string().trim().min(1).max(120).optional(),
  level: z.enum(EDUCATION_LEVELS).optional(),
  location: z.string().trim().min(1).max(120).optional(),
  availability: z.array(availabilitySlotSchema).max(14).optional(),
  /** Ceiling in naira, not kobo. Must be a positive whole number. */
  budget: z.number().int().positive().max(10_000_000).optional(),
  teachingMode: z.enum(TEACHING_MODES).optional(),
  minExperienceYears: z.number().int().min(0).max(60).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type MatchingRequirementsInput = z.infer<
  typeof matchingRequirementsSchema
>;
