import { CalendarDays, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function AgendaPage() {
  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Je afspraken en komende activiteiten."
      >
        <Button disabled>
          <Plus className="size-4" /> Nieuwe afspraak
        </Button>
      </PageHeader>
      <EmptyState
        icon={CalendarDays}
        title="Module in aanbouw"
        description="De agenda-module wordt zo geactiveerd."
      />
    </div>
  );
}
