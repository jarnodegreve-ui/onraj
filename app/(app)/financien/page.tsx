import { FinanceView } from "@/components/finance/finance-view";
import { listBudgets } from "@/lib/data/budgets";
import {
  ensureRecurringTransactions,
  listRecurring,
} from "@/lib/data/recurring";
import { listTransactions } from "@/lib/data/transactions";
import { currentMonthKey } from "@/lib/finance";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { Budget, RecurringTransaction, Transaction } from "@/lib/types";

export default async function FinancienPage() {
  if (supabaseConfigured) {
    try {
      // Vul ontbrekende maanden van vaste posten aan (idempotent).
      await ensureRecurringTransactions();
    } catch {
      // Mag de pagina nooit breken; toon dan gewoon de bestaande data.
    }
  }

  const [transactions, budgets, recurring] = supabaseConfigured
    ? await Promise.all([listTransactions(), listBudgets(), listRecurring()])
    : [[] as Transaction[], [] as Budget[], [] as RecurringTransaction[]];

  return (
    <FinanceView
      transactions={transactions}
      budgets={budgets}
      recurring={recurring}
      initialMonth={currentMonthKey()}
      preview={!supabaseConfigured}
    />
  );
}
