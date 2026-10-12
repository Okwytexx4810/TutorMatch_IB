import { getProfile } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import type { AvailabilitySlot, DayPeriod, WeekDay } from "@/types/domain";

/**
 * Read helper for a tutor's weekly availability.
 *
 * Server-only by convention. Resolves the tutor from the session, so there is
 * no signature that could ask for another tutor's availability. `tutor_availability`
 * is publicly readable, but this helper is scoped to the signed-in tutor's own
 * rows for the settings form.
 */

export interface CurrentTutorAvailability {
  slots: AvailabilitySlot[];
  /** Presence of an error. The message is for the server log only. */
  isError: boolean;
}

export async function getCurrentTutorAvailability(): Promise<CurrentTutorAvailability> {
  const profile = await getProfile();
  if (!profile) return { slots: [], isError: false };

  const supabase = await getServerSupabase();

  const tutor = await supabase
    .from("tutor_profiles")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const tutorId = (tutor.data as { id: string } | null | undefined)?.id;
  if (tutor.error || !tutorId) return { slots: [], isError: Boolean(tutor.error) };

  const result = await supabase
    .from("tutor_availability")
    .select("day, period")
    .eq("tutor_id", tutorId);

  if (result.error) return { slots: [], isError: true };

  const rows =
    (result.data as { day: WeekDay; period: DayPeriod }[] | null | undefined) ??
    [];

  return {
    slots: rows.map((row) => ({ day: row.day, period: row.period })),
    isError: false,
  };
}
