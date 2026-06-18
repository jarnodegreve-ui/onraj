import { FinanceView } from "@/components/finance/finance-view";
import { listBudgets } from "@/lib/data/budgets";
import { listTransactions } from "@/lib/data/transactions";
import { currentMonthKey } from "@/lib/finance";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { Budget, Transaction } from "@/lib/types";

export default async function FinancienPage() {
  const [transactions, budgets] = supabaseConfigured
    ? await Promise.all([listTransactions(), listBudgets()])
    : [[] as Transaction[], [] as Budget[]];

  return (
    <FinanceView
      transactions={transactions}
      budgets={budgets}
      initialMonth={currentMonthKey()}
      preview={!supabaseConfigured}
    />
  );
}
