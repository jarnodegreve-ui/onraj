import { toNote } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

/**
 * Haalt notities op (vastgepinde eerst, daarna recentste bovenaan).
 * Gearchiveerde notities worden standaard weggefilterd (client-side, zodat dit
 * ook werkt vóór migratie 0010 gedraaid is).
 */
export async function listNotes(includeArchived = false): Promise<Note[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  // Soft-deleted (prullenbak) wegfilteren — client-side, robuust vóór migr. 0018.
  const notes = (data ?? []).filter((row) => !row.deleted_at).map(toNote);
  return includeArchived ? notes : notes.filter((note) => !note.archived);
}
