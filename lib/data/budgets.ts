import { toBudget } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Budget } from "@/lib/types";
import { isMissingTable } from "./safe";

/** Haalt alle budgetten op, alfabetisch op categorie. */
export async function listBudgets(): Promise<Budget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .order("category", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toBudget);
}
