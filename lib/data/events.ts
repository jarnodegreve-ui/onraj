import { toCalendarEvent } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/lib/types";

/** Haalt alle afspraken op, oplopend op begintijd. */
export async function listEvents(): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true });

  if (error) throw new Error(error.message);
  // Soft-deleted (prullenbak) wegfilteren — client-side, robuust vóór migr. 0018.
  return (data ?? []).filter((row) => !row.deleted_at).map(toCalendarEvent);
}
