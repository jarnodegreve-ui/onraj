import { addDays, format, getDay, parseISO } from "date-fns";

import { currentDayKey } from "@/lib/agenda";
import { toRecurringTask } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { RecurringTask } from "@/lib/types";
import { isMissingTable } from "./safe";

/** Alle terugkerende-taak-sjablonen (recentste eerst). Leeg tot migratie 0016. */
export async function listRecurringTasks(): Promise<RecurringTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toRecurringTask);
}

// Valt een datum op een occurrence van het sjabloon?
function matches(template: RecurringTask, date: Date): boolean {
  if (template.frequency === "dagelijks") return true;
  if (template.frequency === "wekelijks") {
    return getDay(date) === (template.weekday ?? 1);
  }
  return date.getDate() === (template.dayOfMonth ?? 1);
}

/**
 * Genereert ontbrekende taken voor alle actieve sjablonen t/m vandaag.
 * Idempotent via `last_generated_on`; backfillt maximaal 31 dagen zodat een
 * lange afwezigheid geen enorme stapel oude taken oplevert. Geeft het aantal
 * aangemaakte taken terug.
 */
export async function ensureRecurringTasks(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_tasks")
    .select("*")
    .eq("active", true);

  if (error) {
    if (isMissingTable(error)) return 0;
    throw new Error(error.message);
  }

  const templates = (data ?? []).map(toRecurringTask);
  const todayKey = currentDayKey();
  const today = parseISO(todayKey);
  const earliest = addDays(today, -31);
  let created = 0;

  for (const template of templates) {
    let from = template.lastGeneratedOn
      ? addDays(parseISO(template.lastGeneratedOn), 1)
      : parseISO(template.startOn);
    if (from < earliest) from = earliest;
    const start = parseISO(template.startOn);
    if (start > from) from = start;

    const rows: Array<Record<string, unknown>> = [];
    for (let d = from; d <= today; d = addDays(d, 1)) {
      if (matches(template, d)) {
        rows.push({
          title: template.title,
          notes: template.notes,
          priority: template.priority,
          category: template.category,
          due_on: format(d, "yyyy-MM-dd"),
        });
      }
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("tasks").insert(rows);
      if (insertError) throw new Error(insertError.message);
      created += rows.length;
    }

    // Markeer t/m vandaag verwerkt (ook zonder occurrence), zodat een tweede
    // bezoek vandaag niets dubbel aanmaakt.
    const { error: updateError } = await supabase
      .from("recurring_tasks")
      .update({ last_generated_on: todayKey })
      .eq("id", template.id);
    if (updateError) throw new Error(updateError.message);
  }

  return created;
}
