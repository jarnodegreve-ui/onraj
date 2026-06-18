import { FinanceView } from "@/components/finance/finance-view";
import { listTransactions } from "@/lib/data/transactions";
import { currentMonthKey } from "@/lib/finance";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function FinancienPage() {
  const transactions = supabaseConfigured ? await listTransactions() : [];
  return (
    <FinanceView
      transactions={transactions}
      initialMonth={currentMonthKey()}
      preview={!supabaseConfigured}
    />
  );
}
