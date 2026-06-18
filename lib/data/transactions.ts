import { toTransaction } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";

/** Haalt alle transacties op, recentste datum eerst. */
export async function listTransactions(): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toTransaction);
}
