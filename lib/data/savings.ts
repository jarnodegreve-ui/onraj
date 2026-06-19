import { toSavingsGoal } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { SavingsGoal } from "@/lib/types";
import { isMissingTable } from "./safe";

/** Haalt alle spaardoelen op, recentste eerst. */
export async function listSavingsGoals(): Promise<SavingsGoal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toSavingsGoal);
}
