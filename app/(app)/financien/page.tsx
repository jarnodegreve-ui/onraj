import { AccountsPanel } from "@/components/finance/accounts-panel";
import { FinanceGate } from "@/components/finance/finance-gate";
import { FinanceLockButton } from "@/components/finance/finance-lock-button";
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
import { financeLockState } from "@/lib/finance-lock";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function FinancienPage() {
  if (!supabaseConfigured) {
    return (
      <FinanceView
        transactions={[]}
        budgets={[]}
        recurring={[]}
        savings={[]}
        initialMonth={currentMonthKey()}
        preview
      />
    );
  }

  const { pinSet, locked } = await financeLockState();
  if (locked) {
    return <FinanceGate hasPin />;
  }

  try {
    // Vul ontbrekende maanden van vaste posten aan (idempotent).
    await ensureRecurringTransactions();
  } catch {
    // Mag de pagina nooit breken.
  }

  const [transactions, budgets, recurring, savings, accountBalances] =
    await Promise.all([
      listTransactions(),
      listBudgets(),
      listRecurring(),
      listSavingsGoals(),
      listAccountBalances(),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <FinanceLockButton pinSet={pinSet} />
      </div>
      <FinanceView
        transactions={transactions}
        budgets={budgets}
        recurring={recurring}
        savings={savings}
        initialMonth={currentMonthKey()}
        preview={false}
      />
      <AccountsPanel balances={accountBalances} />
    </div>
  );
}
