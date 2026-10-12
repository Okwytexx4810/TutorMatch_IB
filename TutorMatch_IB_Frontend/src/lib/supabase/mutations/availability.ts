import { getUser } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCurrentTutorProfile } from "@/lib/supabase/queries/tutor-profile";
import type { AvailabilitySlot, DayPeriod, WeekDay } from "@/types/domain";

/**
 * Write helper for a tutor's weekly availability.
 *
 * Server-only by convention, per `lib/supabase/README.md`. Identity is derived
 * from the session (`getCurrentTutorProfile`), never from the payload. The rows
 * are the selected day/period pairs; existing rows are left in place, missing
 * ones are inserted, and any slot the tutor unticked is deleted — so the saved
 * set is exactly what the form showed.
 */

const MESSAGES = {
  signedOut: "Your session has expired. Please sign in again.",
  noProfile: "Create your tutor profile before setting your availability.",
  failed: "We could not save your availability just now. Please try again.",
} as const;

export type SaveAvailabilityResult = { ok: true } | { ok: false; message: string };

export async function saveCurrentTutorAvailability(
  slots: AvailabilitySlot[],
): Promise<SaveAvailabilityResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: MESSAGES.signedOut };

  const tutorProfile = await getCurrentTutorProfile();
  if (!tutorProfile) return { ok: false, message: MESSAGES.noProfile };

  const supabase = await getServerSupabase();

  const desired = new Map<string, { tutor_id: string; day: WeekDay; period: DayPeriod }>();
  for (const slot of slots) {
    desired.set(`${slot.day}\u0000${slot.period}`, {
      tutor_id: tutorProfile.id,
      day: slot.day,
      period: slot.period,
    });
  }

  const existingResult = await supabase
    .from("tutor_availability")
    .select("day, period")
    .eq("tutor_id", tutorProfile.id);

  if (existingResult.error) return { ok: false, message: MESSAGES.failed };

  const existing =
    (existingResult.data as { day: WeekDay; period: DayPeriod }[] | null) ?? [];
  const existingKeys = new Set(
    existing.map((row) => `${row.day}\u0000${row.period}`),
  );

  const toInsert = Array.from(desired.entries())
    .filter(([key]) => !existingKeys.has(key))
    .map(([, row]) => row);

  if (toInsert.length > 0) {
    const insertResult = await supabase
      .from("tutor_availability")
      .upsert(toInsert, {
        onConflict: "tutor_id,day,period",
        ignoreDuplicates: true,
      });
    if (insertResult.error) return { ok: false, message: MESSAGES.failed };
  }

  const toDelete = existing.filter(
    (row) => !desired.has(`${row.day}\u0000${row.period}`),
  );

  for (const row of toDelete) {
    const deleteResult = await supabase
      .from("tutor_availability")
      .delete()
      .eq("tutor_id", tutorProfile.id)
      .eq("day", row.day)
      .eq("period", row.period);
    if (deleteResult.error) return { ok: false, message: MESSAGES.failed };
  }

  return { ok: true };
}
