import { toNote } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

/** Haalt alle notities op (vastgepinde eerst, daarna recentste bovenaan). */
export async function listNotes(): Promise<Note[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toNote);
}
