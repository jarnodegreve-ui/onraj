import { toRecurringTransaction } from "@/lib/mappers";
import { currentMonthKey, shiftMonth } from "@/lib/month";
import { createClient } from "@/lib/supabase/server";
import type { RecurringTransaction } from "@/lib/types";
import { isMissingTable } from "./safe";

/** Haalt alle terugkerende sjablonen op (recentste eerst). */
export async function listRecurring(): Promise<RecurringTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toRecurringTransaction);
}

/**
 * Materialiseert ontbrekende transacties voor alle actieve sjablonen tot en
 * met de huidige maand. Idempotent dankzij `last_generated_month`: een tweede
 * keer draaien maakt niets dubbel aan. Geeft het aantal aangemaakte transacties
 * terug.
 */
export async function ensureRecurringTransactions(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("active", true);

  if (error) {
    if (isMissingTable(error)) return 0;
    throw new Error(error.message);
  }

  const templates = (data ?? []).map(toRecurringTransaction);
  const current = currentMonthKey();
  let created = 0;

  for (const template of templates) {
    // Eerste te genereren maand: na de laatst gegenereerde, maar minstens de start.
    let month = template.startMonth;
    if (template.lastGeneratedMonth && template.lastGeneratedMonth >= month) {
      month = shiftMonth(template.lastGeneratedMonth, 1);
    }
    // Niet voorbij de huidige maand, en niet voorbij een eventuele einddatum.
    const limit =
      template.endMonth && template.endMonth < current
        ? template.endMonth
        : current;
    if (month > limit) continue;

    const day = String(template.dayOfMonth).padStart(2, "0");
    const rows: Array<Record<string, unknown>> = [];
    while (month <= limit) {
      rows.push({
        occurred_on: `${month}-${day}`,
        amount: template.amount,
        direction: template.direction,
        category: template.category,
        description: template.description,
        account: template.account,
      });
      month = shiftMonth(month, 1);
    }

    if (rows.length === 0) continue;

    const { error: insertError } = await supabase
      .from("transactions")
      .insert(rows);
    if (insertError) throw new Error(insertError.message);

    const { error: updateError } = await supabase
      .from("recurring_transactions")
      .update({ last_generated_month: limit })
      .eq("id", template.id);
    if (updateError) throw new Error(updateError.message);

    created += rows.length;
  }

  return created;
}
