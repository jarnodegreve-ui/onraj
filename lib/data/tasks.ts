import { toTask } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";
import { isMissingTable } from "./safe";

/** Haalt alle taken op: openstaande eerst, dan op deadline, dan recentste. */
export async function listTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("done", { ascending: true })
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  // Soft-deleted (prullenbak) wegfilteren — client-side, robuust vóór migr. 0018.
  return (data ?? []).filter((row) => !row.deleted_at).map(toTask);
}
