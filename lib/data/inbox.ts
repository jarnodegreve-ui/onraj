import { createClient } from "@/lib/supabase/server";

export type InboxKind = "taak" | "notitie";

export interface InboxItem {
  kind: InboxKind;
  id: string;
  title: string;
  subtitle: string;
  category: string | null;
  createdAt: string;
}

/**
 * Alle nog-te-triëren captures (inbox = true), nieuwste eerst. Robuust vóór
 * migratie 0020: select("*") + client-side filter, dus zonder inbox-kolom is
 * de inbox simpelweg leeg.
 */
export async function listInbox(): Promise<InboxItem[]> {
  const supabase = await createClient();
  const [tasks, notes] = await Promise.all([
    supabase.from("tasks").select("*"),
    supabase.from("notes").select("*"),
  ]);

  const items: InboxItem[] = [];

  for (const r of tasks.data ?? []) {
    if (!r.inbox || r.deleted_at) continue;
    items.push({
      kind: "taak",
      id: r.id,
      title: r.title || "Naamloze taak",
      subtitle: r.notes ? String(r.notes).slice(0, 80) : "",
      category: r.category ?? null,
      createdAt: r.created_at,
    });
  }
  for (const r of notes.data ?? []) {
    if (!r.inbox || r.deleted_at) continue;
    items.push({
      kind: "notitie",
      id: r.id,
      title: r.title || "Naamloze notitie",
      subtitle: r.body ? String(r.body).slice(0, 80) : "",
      category: r.category ?? null,
      createdAt: r.created_at,
    });
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

/**
 * Aantal nog-te-triëren captures — voor de badge op de Inbox-navigatie. Lichte
 * count-queries (head: true, geen rijen). Robuust vóór migratie 0020/0018: een
 * ontbrekende kolom geeft een fout → telt als 0.
 */
export async function countInbox(): Promise<number> {
  const supabase = await createClient();
  const [tasks, notes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("inbox", true)
      .is("deleted_at", null),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("inbox", true)
      .is("deleted_at", null),
  ]);
  const t = tasks.error ? 0 : (tasks.count ?? 0);
  const n = notes.error ? 0 : (notes.count ?? 0);
  return t + n;
}
