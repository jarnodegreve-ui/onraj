"use server";

import { formatDate, formatEuro } from "@/lib/format";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type SearchType = "notitie" | "transactie" | "taak";

export interface SearchItem {
  id: string;
  type: SearchType;
  label: string;
  sublabel: string;
  href: string;
}

/**
 * Bouwt een zoekindex over alle modules (max 100 per type). Ontbrekende
 * tabellen leveren simpelweg geen resultaten (data null → overslaan).
 */
export async function loadSearchIndex(): Promise<SearchItem[]> {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();

  const [notes, transactions, tasks] = await Promise.all([
    supabase
      .from("notes")
      .select("id,title,tags")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("transactions")
      .select("id,description,category,amount,direction")
      .is("deleted_at", null)
      .order("occurred_on", { ascending: false })
      .limit(100),
    supabase
      .from("tasks")
      .select("id,title,due_on,done")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const items: SearchItem[] = [];

  for (const note of notes.data ?? []) {
    items.push({
      id: `note-${note.id}`,
      type: "notitie",
      label: note.title || "Naamloos",
      sublabel: (note.tags ?? []).join(", "),
      href: "/notities",
    });
  }

  for (const tx of transactions.data ?? []) {
    const amount =
      typeof tx.amount === "string" ? Number.parseFloat(tx.amount) : tx.amount;
    const sign = tx.direction === "inkomst" ? "+" : "−";
    items.push({
      id: `tx-${tx.id}`,
      type: "transactie",
      label:
        tx.description ||
        tx.category ||
        (tx.direction === "inkomst" ? "Inkomst" : "Uitgave"),
      sublabel: `${sign} ${formatEuro(amount)}${tx.category ? ` · ${tx.category}` : ""}`,
      href: "/financien",
    });
  }

  for (const task of tasks.data ?? []) {
    items.push({
      id: `task-${task.id}`,
      type: "taak",
      label: task.title,
      sublabel: task.done
        ? "Afgewerkt"
        : task.due_on
          ? formatDate(task.due_on)
          : "Open",
      href: "/taken",
    });
  }

  return items;
}
