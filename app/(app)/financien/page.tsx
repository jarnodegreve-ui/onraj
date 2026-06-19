import { FinanceView } from "@/components/finance/finance-view";
import { listBudgets } from "@/lib/data/budgets";
import {
  ensureRecurringTransactions,
  listRecurring,
} from "@/lib/data/recurring";
import { listSavingsGoals } from "@/lib/data/savings";
import { listTransactions } from "@/lib/data/transactions";
import { currentMonthKey } from "@/lib/finance";
import { supabaseConfigured } from "@/lib/supabase/env";
import type {
  Budget,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
} from "@/lib/types";

export default async function FinancienPage() {
  if (supabaseConfigured) {
    try {
      // Vul ontbrekende maanden van vaste posten aan (idempotent).
      await ensureRecurringTransactions();
    } catch {
      // Mag de pagina nooit breken; toon dan gewoon de bestaande data.
    }
  }

  const [transactions, budgets, recurring, savings] = supabaseConfigured
    ? await Promise.all([
        listTransactions(),
        listBudgets(),
        listRecurring(),
        listSavingsGoals(),
      ])
    : [
        [] as Transaction[],
        [] as Budget[],
        [] as RecurringTransaction[],
        [] as SavingsGoal[],
      ];

  return (
    <FinanceView
      transactions={transactions}
      budgets={budgets}
      recurring={recurring}
      savings={savings}
      initialMonth={currentMonthKey()}
      preview={!supabaseConfigured}
    />
  );
}
