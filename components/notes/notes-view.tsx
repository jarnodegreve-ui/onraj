"use client";

import { useMemo, useState, useTransition } from "react";
import {
  closestCenter,
  closestCorners,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  Download,
  GripVertical,
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
import { reorderCategories } from "@/lib/actions/categories";
import { setNoteCategory } from "@/lib/actions/notes";
import { reorderNotes } from "@/lib/actions/reorder";
import { resyncVault } from "@/lib/actions/vault";
import { orderByManaged, suggestionList } from "@/lib/categories";
import type { Category, Note } from "@/lib/types";
import { cn } from "@/lib/utils";

const ZONDER = "__zonder";
function columnKey(name: string | null) {
  return name ?? ZONDER;
}

// Sleep een kaart → kolomdroppables; sleep een notitie → containers + notities.
const collision: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  const isCard = activeId.startsWith("card:");
  const containers = args.droppableContainers.filter((c) => {
    const id = String(c.id);
    return isCard ? id.startsWith("card:") : !id.startsWith("card:");
  });
  return closestCorners({ ...args, droppableContainers: containers });
};

export function NotesView({
  notes,
  preview,
  vaultConnected,
  categories = [],
}: {
  notes: Note[];
  preview: boolean;
  vaultConnected: boolean;
  categories?: Category[];
}) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<"lijst" | "rooster">("lijst");
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [cardOrder, setCardOrder] = useState<string[] | null>(null);
  const [catOverride, setCatOverride] = useState<Record<string, string | null>>(
    {},
  );
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [syncing, startSync] = useTransition();

  // Wis de optimistische hercategorisatie zodra de server nieuwe data levert.
  const [prevNotes, setPrevNotes] = useState(notes);
  if (prevNotes !== notes) {
    setPrevNotes(notes);
    setCatOverride({});
  }

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

  const colorByName = useMemo(
    () => new Map(categories.map((category) => [category.name, category.color])),
    [categories],
  );

  const inUseCategories = useMemo(
    () =>
      Array.from(
        new Set(
          notes.map((note) => note.category).filter((c): c is string => !!c),
        ),
      ),
    [notes],
  );

  // Filterbalk: enkel categorieën in gebruik, in de beheerde volgorde.
  const filterCategories = useMemo(
    () => orderByManaged(inUseCategories, categories),
    [inUseCategories, categories],
  );

  // Editor-suggesties: alle beheerde categorieën (ook ongebruikte) eerst.
  const editorCategories = useMemo(
    () => suggestionList(inUseCategories, categories),
    [inUseCategories, categories],
  );

  const archivedCount = useMemo(
    () => notes.filter((note) => note.archived).length,
    [notes],
  );

  // Herorden binnen een kaart kan enkel op de volledige actieve lijst (geen
  // filter/archief), anders is de volgorde van een subset dubbelzinnig.
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

  // Optimistische hercategorisatie toepassen vóór het groeperen.
  const visibleWithOverride = useMemo(
    () =>
      visible.map((note) =>
        note.id in catOverride
          ? { ...note, category: catOverride[note.id] }
          : note,
      ),
    [visible, catOverride],
  );

  const grouped = useMemo(
    () => groupByCategory(visibleWithOverride, categories),
    [visibleWithOverride, categories],
  );

  const orderedGroups = useMemo(() => {
    if (!cardOrder) return grouped;
    const idx = new Map(cardOrder.map((id, index) => [id, index]));
    return [...grouped].sort((a, b) => {
      if (a.name === null) return 1;
      if (b.name === null) return -1;
      return (idx.get(a.name) ?? 1e6) - (idx.get(b.name) ?? 1e6);
    });
  }, [grouped, cardOrder]);

  const colByNote = useMemo(() => {
    const map = new Map<string, string>();
    for (const note of visibleWithOverride) {
      map.set(note.id, columnKey(note.category));
    }
    return map;
  }, [visibleWithOverride]);

  const cardsReorderable =
    grouped.filter((group) => group.name !== null).length >= 2;

  const activeNote = activeNoteId
    ? (visible.find((note) => note.id === activeNoteId) ?? null)
    : null;

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

  // Roosterweergave: notities herordenen in het raster.
  function onGridDragEnd(event: DragEndEvent) {
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

  function onListDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveNoteId(id.startsWith("card:") ? null : id);
  }

  function onListDragEnd(event: DragEndEvent) {
    setActiveNoteId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("card:")) {
      if (activeId !== overId) reorderCards(activeId, overId);
      return;
    }

    const sourceCol = colByNote.get(activeId);
    if (!sourceCol) return;
    let targetCol: string;
    if (overId.startsWith("col:")) targetCol = overId.slice(4);
    else if (overId.startsWith("card:")) targetCol = overId.slice(5);
    else targetCol = colByNote.get(overId) ?? sourceCol;

    if (targetCol === sourceCol) {
      if (activeId === overId || !dragEnabled) return;
      reorderWithinColumn(sourceCol, activeId, overId);
    } else {
      recategorize(activeId, targetCol);
    }
  }

  function reorderWithinColumn(
    colKey: string,
    activeId: string,
    overId: string,
  ) {
    const group = orderedGroups.find((g) => columnKey(g.name) === colKey);
    if (!group) return;
    const colIds = group.notes.map((note) => note.id);
    const oldIndex = colIds.indexOf(activeId);
    const newIndex = colIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;
    const newColIds = arrayMove(colIds, oldIndex, newIndex);
    const colSet = new Set(colIds);
    let k = 0;
    const result = visible.map((note) =>
      colSet.has(note.id) ? newColIds[k++] : note.id,
    );
    setLocalOrder(result);
    void reorderNotes(result).then((res) => {
      if (!res.ok) {
        toast.error("Volgorde opslaan mislukt", { description: res.error });
      }
    });
  }

  function recategorize(noteId: string, targetCol: string) {
    const newCat = targetCol === ZONDER ? null : targetCol;
    setCatOverride((prev) => ({ ...prev, [noteId]: newCat }));
    void setNoteCategory(noteId, newCat).then((res) => {
      if (!res.ok) {
        setCatOverride((prev) => {
          const next = { ...prev };
          delete next[noteId];
          return next;
        });
        toast.error("Verplaatsen mislukt", { description: res.error });
      }
    });
  }

  function reorderCards(activeId: string, overId: string) {
    const currentOrder = orderedGroups.map((g) => `card:${columnKey(g.name)}`);
    const oldIndex = currentOrder.indexOf(activeId);
    const newIndex = currentOrder.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(currentOrder, oldIndex, newIndex).map((id) =>
      id.slice(5),
    );
    setCardOrder(newOrder);

    const idByName = new Map(categories.map((c) => [c.name, c.id]));
    const newVisibleIds = newOrder
      .filter((key) => key !== ZONDER && idByName.has(key))
      .map((key) => idByName.get(key) as string);
    if (newVisibleIds.length === 0) return;
    const visibleIdSet = new Set(newVisibleIds);
    let k = 0;
    const result = categories
      .map((c) => c.id)
      .map((id) => (visibleIdSet.has(id) ? newVisibleIds[k++] : id));
    void reorderCategories("note", result).then((res) => {
      if (!res.ok) {
        toast.error("Volgorde opslaan mislukt", { description: res.error });
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

          {filterCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted-foreground">
                Categorie:
              </span>
              <FilterChip
                label="Alle"
                active={activeCategory === null}
                onClick={() => setActiveCategory(null)}
              />
              {filterCategories.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  active={activeCategory === category}
                  color={colorByName.get(category)}
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
          ) : view === "lijst" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={collision}
              onDragStart={onListDragStart}
              onDragEnd={onListDragEnd}
            >
              <SortableContext
                items={orderedGroups.map(
                  (group) => `card:${columnKey(group.name)}`,
                )}
                strategy={rectSortingStrategy}
              >
                <div className="grid items-start gap-4 lg:grid-cols-2">
                  {orderedGroups.map((group) => (
                    <NoteColumn
                      key={columnKey(group.name)}
                      group={group}
                      reorderable={cardsReorderable && group.name !== null}
                      onEdit={openEdit}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeNote ? <NoteOverlayRow note={activeNote} /> : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onGridDragEnd}
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
                      categoryColor={
                        note.category
                          ? colorByName.get(note.category)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <NoteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        note={editing}
        categories={editorCategories}
      />
    </div>
  );
}

// Eén categoriekolom: zelf versleepbaar (kop-handvat → categorievolgorde) en een
// droppable voor notities (slepen erin = hercategoriseren).
function NoteColumn({
  group,
  reorderable,
  onEdit,
}: {
  group: NoteGroup;
  reorderable: boolean;
  onEdit: (note: Note) => void;
}) {
  const colKey = columnKey(group.name);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `card:${colKey}`, disabled: !reorderable });
  const { setNodeRef: setColRef, isOver } = useDroppable({
    id: `col:${colKey}`,
  });
  const noteIds = group.notes.map((note) => note.id);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-slot="card"
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        {reorderable && (
          <button
            type="button"
            className="-ml-1 cursor-grab touch-none text-muted-foreground/60 hover:text-foreground"
            aria-label="Versleep categorie"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        {group.name &&
          (group.color ? (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: group.color }}
            />
          ) : (
            <span className="size-2.5 shrink-0 rounded-full border border-muted-foreground/40" />
          ))}
        <h3 className="flex-1 truncate text-sm font-semibold">
          {group.name ?? "Zonder categorie"}
        </h3>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {group.notes.length}
        </span>
      </div>
      <SortableContext items={noteIds} strategy={verticalListSortingStrategy}>
        <ul
          ref={setColRef}
          className={cn(
            "min-h-11 divide-y border-t transition-colors",
            isOver && "bg-primary/5",
          )}
        >
          {group.notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              onEdit={onEdit}
              draggable
              hideCategory
              categoryColor={group.color}
            />
          ))}
          {group.notes.length === 0 && (
            <li className="px-3 py-3 text-center text-xs text-muted-foreground">
              Sleep een notitie hierheen
            </li>
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

// Zwevende kopie tijdens het slepen van een notitie.
function NoteOverlayRow({ note }: { note: Note }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-xl">
      <span className="truncate text-sm font-medium">
        {note.title || "Naamloos"}
      </span>
    </div>
  );
}

type NoteGroup = { name: string | null; color: string | null; notes: Note[] };

// Groepeert notities per categorie; volgorde volgt de beheerde categorielijst,
// "Zonder categorie" komt achteraan.
function groupByCategory(notes: Note[], categories: Category[]): NoteGroup[] {
  const order = new Map(
    categories.map((category, index) => [category.name, index]),
  );
  const colorOf = new Map(
    categories.map((category) => [category.name, category.color]),
  );
  const buckets = new Map<string, Note[]>();
  for (const note of notes) {
    const key = note.category ?? "";
    const list = buckets.get(key);
    if (list) list.push(note);
    else buckets.set(key, [note]);
  }
  const groups: NoteGroup[] = [...buckets.entries()].map(([key, list]) => ({
    name: key || null,
    color: key ? (colorOf.get(key) ?? null) : null,
    notes: list,
  }));
  const rank = (name: string) => order.get(name) ?? Number.MAX_SAFE_INTEGER;
  groups.sort((a, b) => {
    if (a.name === null) return 1;
    if (b.name === null) return -1;
    const diff = rank(a.name) - rank(b.name);
    return diff !== 0 ? diff : a.name.localeCompare(b.name, "nl");
  });
  return groups;
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {color && (
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}
