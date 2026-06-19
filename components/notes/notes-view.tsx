"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Download, NotebookPen, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { NoteCard } from "@/components/notes/note-card";
import { NoteEditor } from "@/components/notes/note-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reorderNotes } from "@/lib/actions/reorder";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NotesView({
  notes,
  preview,
}: {
  notes: Note[];
  preview: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const allTags = useMemo(
    () =>
      Array.from(new Set(notes.flatMap((note) => note.tags))).sort((a, b) =>
        a.localeCompare(b, "nl"),
      ),
    [notes],
  );

  // Verslepen kan enkel op de volledige lijst (geen zoek-/tagfilter actief),
  // anders is de volgorde van een subset dubbelzinnig.
  const dragEnabled = query.trim() === "" && activeTag === null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = notes.filter((note) => {
      const matchesQuery =
        !q ||
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchesTag = !activeTag || note.tags.includes(activeTag);
      return matchesQuery && matchesTag;
    });
    const idx = new Map(localOrder.map((id, index) => [id, index]));
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; // vastgepind eerst
      const ai = idx.get(a.id) ?? 1e6 + a.position;
      const bi = idx.get(b.id) ?? 1e6 + b.position;
      return ai - bi;
    });
  }, [notes, query, activeTag, localOrder]);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setEditorOpen(true);
  }

  function exportNotes() {
    // De route stuurt een ZIP met één .md-bestand per notitie (Obsidian-klaar).
    window.location.href = "/api/notes/export";
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = visible.map((note) => note.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    setLocalOrder(newIds);
    void reorderNotes(newIds).then((result) => {
      if (!result.ok) {
        toast.error("Volgorde opslaan mislukt", { description: result.error });
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Notities"
        description="Je markdown-notities met tags en zoeken."
      >
        {!preview && notes.length > 0 && (
          <Button variant="outline" onClick={exportNotes}>
            <Download className="size-4" /> Exporteer
          </Button>
        )}
        <Button onClick={openNew} disabled={preview}>
          <Plus className="size-4" /> Nieuwe notitie
        </Button>
      </PageHeader>

      {preview ? (
        <EmptyState
          icon={NotebookPen}
          title="Preview-modus"
          description="Koppel Supabase om notities te bewaren."
        />
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoeken in notities…"
              className="pl-8"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                label="Alles"
                active={activeTag === null}
                onClick={() => setActiveTag(null)}
              />
              {allTags.map((tag) => (
                <FilterChip
                  key={tag}
                  label={tag}
                  active={activeTag === tag}
                  onClick={() =>
                    setActiveTag((current) => (current === tag ? null : tag))
                  }
                />
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title={notes.length === 0 ? "Nog geen notities" : "Niets gevonden"}
              description={
                notes.length === 0
                  ? "Maak je eerste notitie aan."
                  : "Pas je zoekopdracht of filter aan."
              }
            >
              {notes.length === 0 && (
                <Button onClick={openNew}>
                  <Plus className="size-4" /> Nieuwe notitie
                </Button>
              )}
            </EmptyState>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={visible.map((note) => note.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={openEdit}
                      draggable={dragEnabled}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <NoteEditor open={editorOpen} onOpenChange={setEditorOpen} note={editing} />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  );
}
