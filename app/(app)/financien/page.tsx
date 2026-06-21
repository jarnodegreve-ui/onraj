import { AccountsPanel } from "@/components/finance/accounts-panel";
import { FinanceView } from "@/components/finance/finance-view";
import { listAccountBalances } from "@/lib/data/accounts";
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
  AccountBalance,
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

  const [transactions, budgets, recurring, savings, accountBalances] =
    supabaseConfigured
      ? await Promise.all([
          listTransactions(),
          listBudgets(),
          listRecurring(),
          listSavingsGoals(),
          listAccountBalances(),
        ])
      : [
          [] as Transaction[],
          [] as Budget[],
          [] as RecurringTransaction[],
          [] as SavingsGoal[],
          [] as AccountBalance[],
        ];

  return (
    <div className="space-y-6">
      <FinanceView
        transactions={transactions}
        budgets={budgets}
        recurring={recurring}
        savings={savings}
        initialMonth={currentMonthKey()}
        preview={!supabaseConfigured}
      />
      {supabaseConfigured && <AccountsPanel balances={accountBalances} />}
    </div>
  );
}
