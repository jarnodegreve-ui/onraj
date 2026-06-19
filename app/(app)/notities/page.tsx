import { NotesView } from "@/components/notes/notes-view";
import { listNotes } from "@/lib/data/notes";
import { githubConfigured } from "@/lib/github";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function NotitiesPage() {
  const notes = supabaseConfigured ? await listNotes() : [];
  return (
    <NotesView
      notes={notes}
      preview={!supabaseConfigured}
      vaultConnected={githubConfigured}
    />
  );
}
