"use client";

import { useMemo, useState, useTransition } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Archive,
  Download,
  LayoutGrid,
  List,
  NotebookPen,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { NoteCard } from "@/components/notes/note-card";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteRow } from "@/components/notes/note-row";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reorderNotes } from "@/lib/actions/reorder";
import { resyncVault } from "@/lib/actions/vault";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NotesView({
  notes,
  preview,
  vaultConnected,
}: {
  notes: Note[];
  preview: boolean;
  vaultConnected: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<"lijst" | "rooster">("lijst");
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [syncing, startSync] = useTransition();

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

  const allCategories = useMemo(
    () =>
      Array.from(
        new Set(notes.map((note) => note.category).filter((c): c is string => !!c)),
      ).sort((a, b) => a.localeCompare(b, "nl")),
    [notes],
  );

  const archivedCount = useMemo(
    () => notes.filter((note) => note.archived).length,
    [notes],
  );

  // Verslepen kan enkel op de volledige actieve lijst (geen filter/archief),
  // anders is de volgorde van een subset dubbelzinnig.
  const dragEnabled =
    query.trim() === "" &&
    activeTag === null &&
    activeCategory === null &&
    !showArchived;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = notes.filter((note) => {
      const matchesQuery =
        !q ||
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchesTag = !activeTag || note.tags.includes(activeTag);
      const matchesCategory =
        !activeCategory || note.category === activeCategory;
      return (
        note.archived === showArchived &&
        matchesQuery &&
        matchesTag &&
        matchesCategory
      );
    });
    const idx = new Map(localOrder.map((id, index) => [id, index]));
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; // vastgepind eerst
      const ai = idx.get(a.id) ?? 1e6 + a.position;
      const bi = idx.get(b.id) ?? 1e6 + b.position;
      return ai - bi;
    });
  }, [notes, query, activeTag, activeCategory, showArchived, localOrder]);

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

  function syncToVault() {
    startSync(async () => {
      const result = await resyncVault();
      if (result.ok) {
        toast.success(
          `${result.count} notitie${result.count === 1 ? "" : "s"} naar Obsidian gesynct`,
        );
      } else {
        toast.error("Sync mislukt", { description: result.error });
      }
    });
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
        {vaultConnected && !preview && notes.length > 0 && (
          <Button variant="outline" onClick={syncToVault} disabled={syncing}>
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} /> Sync
            Obsidian
          </Button>
        )}
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
          <div className="flex items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoeken in notities…"
                className="pl-8"
              />
            </div>
            <div className="flex items-center rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => setView("lijst")}
                aria-label="Lijstweergave"
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === "lijst"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("rooster")}
                aria-label="Roosterweergave"
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === "rooster"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived((value) => !value)}
            >
              <Archive className="size-4" />
              Archief{archivedCount > 0 ? ` (${archivedCount})` : ""}
            </Button>
          </div>

          {allCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted-foreground">
                Categorie:
              </span>
              <FilterChip
                label="Alle"
                active={activeCategory === null}
                onClick={() => setActiveCategory(null)}
              />
              {allCategories.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  active={activeCategory === category}
                  onClick={() =>
                    setActiveCategory((current) =>
                      current === category ? null : category,
                    )
                  }
                />
              ))}
            </div>
          )}

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
              icon={showArchived ? Archive : NotebookPen}
              title={
                showArchived
                  ? "Geen gearchiveerde notities"
                  : notes.length === 0
                    ? "Nog geen notities"
                    : "Niets gevonden"
              }
              description={
                showArchived
                  ? "Gearchiveerde notities verschijnen hier."
                  : notes.length === 0
                    ? "Maak je eerste notitie aan."
                    : "Pas je zoekopdracht of filter aan."
              }
            >
              {!showArchived && notes.length === 0 && (
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
                strategy={
                  view === "lijst"
                    ? verticalListSortingStrategy
                    : rectSortingStrategy
                }
              >
                {view === "lijst" ? (
                  <ul className="max-w-4xl divide-y rounded-lg border bg-card">
                    {visible.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        onEdit={openEdit}
                        draggable={dragEnabled}
                      />
                    ))}
                  </ul>
                ) : (
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
                )}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <NoteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        note={editing}
        categories={allCategories}
      />
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
