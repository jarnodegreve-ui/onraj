import { PageHeader } from "@/components/page-header";
import { CategoryManager } from "@/components/settings/category-manager";
import { TrashManager } from "@/components/settings/trash-manager";
import { Card, CardContent } from "@/components/ui/card";
import { listCategories } from "@/lib/data/categories";
import { listTrashed } from "@/lib/data/trash";
import { supabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Instellingen · ONRAJ" };

export default async function InstellingenPage() {
  if (!supabaseConfigured) {
    return (
      <div>
        <PageHeader
          title="Instellingen"
          description="Beheer je categorieën voor taken en notities."
        />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Verbind Supabase om je instellingen te beheren.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [taskCategories, noteCategories, trashed] = await Promise.all([
    listCategories("task"),
    listCategories("note"),
    listTrashed(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Instellingen"
        description="Beheer je categorieën — voeg toe, hernoem, geef een kleur of sleep om te herordenen."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryManager
          scope="task"
          title="Taken-categorieën"
          accent="#14b8a6"
          categories={taskCategories}
        />
        <CategoryManager
          scope="note"
          title="Notitie-categorieën"
          accent="#3d5afe"
          categories={noteCategories}
        />
      </div>
      <TrashManager items={trashed} />
    </div>
  );
}
