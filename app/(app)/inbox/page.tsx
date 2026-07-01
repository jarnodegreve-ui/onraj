import { InboxManager } from "@/components/inbox/inbox-manager";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listCategories } from "@/lib/data/categories";
import { listInbox } from "@/lib/data/inbox";
import { supabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Inbox · onraj" };

export default async function InboxPage() {
  if (!supabaseConfigured) {
    return (
      <div>
        <PageHeader
          title="Inbox"
        />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Verbind Supabase om je inbox te gebruiken.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [items, taskCats, noteCats] = await Promise.all([
    listInbox(),
    listCategories("task"),
    listCategories("note"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
      />
      <InboxManager
        items={items}
        taskCategories={taskCats.map((c) => c.name)}
        noteCategories={noteCats.map((c) => c.name)}
      />
    </div>
  );
}
