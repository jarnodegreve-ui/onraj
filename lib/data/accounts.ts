import { isMissingTable } from "@/lib/data/safe";
import { toAccountBalance } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { AccountBalance } from "@/lib/types";

/** Alle rekeningstanden (oudste maand eerst). Lege lijst tot migratie 0012. */
export async function listAccountBalances(): Promise<AccountBalance[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_balances")
    .select("*")
    .order("month", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toAccountBalance);
}

/** Laatste saldo per rekening (voor het dashboard-staafdiagram). */
export function latestPerAccount(balances: AccountBalance[]): AccountBalance[] {
  const latest = new Map<string, AccountBalance>();
  for (const balance of balances) {
    const current = latest.get(balance.account);
    if (!current || balance.month > current.month) {
      latest.set(balance.account, balance);
    }
  }
  return [...latest.values()].sort((a, b) => b.amount - a.amount);
}

/** Totaal vermogen per maand (som van alle rekeningen), oudste maand eerst. */
export function netWorthByMonth(
  balances: AccountBalance[],
): { month: string; total: number }[] {
  const byMonth = new Map<string, number>();
  for (const balance of balances) {
    const key = balance.month.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + balance.amount);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
}
