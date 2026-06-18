import { NotebookPen, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function NotitiesPage() {
  return (
    <div>
      <PageHeader
        title="Notities"
        description="Je markdown-notities met tags en zoeken."
      >
        <Button disabled>
          <Plus className="size-4" /> Nieuwe notitie
        </Button>
      </PageHeader>
      <EmptyState
        icon={NotebookPen}
        title="Module in aanbouw"
        description="De notities-module wordt zo geactiveerd."
      />
    </div>
  );
}
