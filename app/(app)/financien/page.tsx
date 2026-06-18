import { Plus, Wallet } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function FinancienPage() {
  return (
    <div>
      <PageHeader
        title="Financiën"
        description="Inkomsten, uitgaven en je maandoverzicht."
      >
        <Button disabled>
          <Plus className="size-4" /> Nieuwe transactie
        </Button>
      </PageHeader>
      <EmptyState
        icon={Wallet}
        title="Module in aanbouw"
        description="De financiën-module wordt zo geactiveerd."
      />
    </div>
  );
}
