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
  // Soft-deleted (prullenbak) wegfilteren — client-side zodat dit ook werkt
  // vóór migratie 0018 (deleted_at-kolom dan afwezig → undefined → behouden).
  return (data ?? []).filter((row) => !row.deleted_at).map(toTransaction);
}
