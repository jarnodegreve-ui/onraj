"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Attachments } from "@/components/attachments";
import { Markdown } from "@/components/markdown";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createNote, updateNote } from "@/lib/actions/notes";
import { submitOnMetaEnter } from "@/lib/forms";
import type { Note } from "@/lib/types";

export function NoteEditor({
  open,
  onOpenChange,
  note,
  categories = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  categories?: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {note ? "Notitie bewerken" : "Nieuwe notitie"}
          </DialogTitle>
          <DialogDescription>Markdown wordt ondersteund.</DialogDescription>
        </DialogHeader>
        {/* key zorgt voor een verse mount (en dus verse beginwaarden) per notitie,
            zonder state te synchroniseren in een effect. */}
        <NoteEditorForm
          key={note?.id ?? "nieuw"}
          note={note}
          categories={categories}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function NoteEditorForm({
  note,
  categories,
  onClose,
}: {
  note: Note | null;
  categories: string[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [category, setCategory] = useState(note?.category ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const input = {
        title,
        body,
        tags,
        pinned: note?.pinned ?? false,
        category: category.trim() || null,
      };
      const result = note
        ? await updateNote(note.id, input)
        : await createNote(input);

      if (result.ok) {
        toast.success(note ? "Notitie bijgewerkt" : "Notitie toegevoegd");
        onClose();
      } else {
        toast.error("Opslaan mislukt", { description: result.error });
      }
    });
  }

  return (
    <>
      <div className="grid gap-4" onKeyDown={submitOnMetaEnter(save)}>
        <div className="grid gap-2">
          <Label htmlFor="note-title">Titel</Label>
          <Input
            id="note-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titel van je notitie"
          />
        </div>

        <div className="grid gap-2">
          <Label>Inhoud</Label>
          <Tabs defaultValue="edit">
            <TabsList>
              <TabsTrigger value="edit">Bewerken</TabsTrigger>
              <TabsTrigger value="preview">Voorbeeld</TabsTrigger>
            </TabsList>
            <TabsContent value="edit">
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Schrijf in markdown…"
                className="min-h-48 font-mono text-sm"
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-48 rounded-md border p-3">
                {body.trim() ? (
                  <Markdown>{body}</Markdown>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Niets om te tonen.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="note-category">Categorie</Label>
          <Input
            id="note-category"
            list="note-categories"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Bv. Werk, Privé, Ideeën…"
          />
          <datalist id="note-categories">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">
            Eén categorie per notitie · komt in een eigen map in je vault.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="note-tags">Tags</Label>
          <TagInput
            id="note-tags"
            value={tags}
            onChange={setTags}
            placeholder="Tag toevoegen en op Enter drukken"
          />
        </div>

        {note && <Attachments entityType="note" entityId={note.id} />}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Annuleren
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </DialogFooter>
    </>
  );
}
