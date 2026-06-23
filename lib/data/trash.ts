import { formatDate, formatEuro } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type TrashType = "taak" | "notitie" | "transactie" | "afspraak";

export interface TrashItem {
  type: TrashType;
  id: string;
  label: string;
  sublabel: string;
  deletedAt: string;
}

/**
 * Haalt alle items in de prullenbak (soft-deleted) op, recentst verwijderd
 * bovenaan. Robuust vóór migratie 0018: select("*") + client-side filter, dus
 * zonder deleted_at-kolom komt er simpelweg niets terug.
 */
export async function listTrashed(): Promise<TrashItem[]> {
  const supabase = await createClient();
  const [tasks, notes, transactions, events] = await Promise.all([
    supabase.from("tasks").select("*"),
    supabase.from("notes").select("*"),
    supabase.from("transactions").select("*"),
    supabase.from("events").select("*"),
  ]);

  const items: TrashItem[] = [];

  for (const row of tasks.data ?? []) {
    if (!row.deleted_at) continue;
    items.push({
      type: "taak",
      id: row.id,
      label: row.title || "Naamloze taak",
      sublabel: "Taak",
      deletedAt: row.deleted_at,
    });
  }
  for (const row of notes.data ?? []) {
    if (!row.deleted_at) continue;
    items.push({
      type: "notitie",
      id: row.id,
      label: row.title || "Naamloze notitie",
      sublabel: "Notitie",
      deletedAt: row.deleted_at,
    });
  }
  for (const row of transactions.data ?? []) {
    if (!row.deleted_at) continue;
    const amount =
      typeof row.amount === "string"
        ? Number.parseFloat(row.amount)
        : row.amount;
    const sign = row.direction === "inkomst" ? "+" : "−";
    items.push({
      type: "transactie",
      id: row.id,
      label:
        row.description ||
        row.category ||
        (row.direction === "inkomst" ? "Inkomst" : "Uitgave"),
      sublabel: `${sign} ${formatEuro(amount)}`,
      deletedAt: row.deleted_at,
    });
  }
  for (const row of events.data ?? []) {
    if (!row.deleted_at) continue;
    items.push({
      type: "afspraak",
      id: row.id,
      label: row.title || "Afspraak",
      sublabel: formatDate(row.starts_at),
      deletedAt: row.deleted_at,
    });
  }

  items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  return items;
}
