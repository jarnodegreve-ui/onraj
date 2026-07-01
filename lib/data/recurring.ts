import { toRecurringTransaction } from "@/lib/mappers";
import { currentMonthKey, shiftMonth } from "@/lib/month";
import { createClient } from "@/lib/supabase/server";
import type { RecurringTransaction } from "@/lib/types";
import { isMissingColumn, isMissingTable } from "./safe";

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
 * met de huidige maand. Race-vrij op DB-niveau (migratie 0025): elke rij draagt
 * recurring_id en de unieke sleutel (recurring_id, occurred_on) laat een
 * gelijktijdige tweede run stilletjes afketsen via on-conflict-do-nothing —
 * `last_generated_month` is daarmee alleen nog een optimalisatie, geen slot.
 * Geeft het aantal gematerialiseerde transacties terug.
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
        recurring_id: template.id,
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

    // Dubbelen (parallelle run) ketsen af op de unieke sleutel i.p.v. dubbel
    // geboekt te worden.
    let { error: insertError } = await supabase
      .from("transactions")
      .upsert(rows, {
        onConflict: "recurring_id,occurred_on",
        ignoreDuplicates: true,
      });
    if (insertError && isMissingColumn(insertError)) {
      // Vóór migratie 0025: oude gedrag zonder recurring_id.
      const legacy = rows.map(({ recurring_id: _r, ...rest }) => {
        void _r;
        return rest;
      });
      ({ error: insertError } = await supabase
        .from("transactions")
        .insert(legacy));
    }
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
