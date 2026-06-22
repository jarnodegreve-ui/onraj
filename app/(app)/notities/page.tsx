import { NotesView } from "@/components/notes/notes-view";
import { listCategories } from "@/lib/data/categories";
import { listNotes } from "@/lib/data/notes";
import { githubConfigured } from "@/lib/github";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function NotitiesPage() {
  if (!supabaseConfigured) {
    return (
      <NotesView
        notes={[]}
        categories={[]}
        preview
        vaultConnected={githubConfigured}
      />
    );
  }

  const [notes, categories] = await Promise.all([
    listNotes(true),
    listCategories("note"),
  ]);

  return (
    <NotesView
      notes={notes}
      categories={categories}
      preview={false}
      vaultConnected={githubConfigured}
    />
  );
}
