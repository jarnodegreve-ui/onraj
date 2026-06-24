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
