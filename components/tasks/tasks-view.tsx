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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Download, GripVertical, ListTodo, Plus } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RecurringTasksButton } from "@/components/tasks/recurring-tasks-dialog";
import { TaskEditor } from "@/components/tasks/task-editor";
import { TaskItem } from "@/components/tasks/task-item";
import { Button } from "@/components/ui/button";
import { reorderCategories } from "@/lib/actions/categories";
import { reorderTasks } from "@/lib/actions/reorder";
import { orderByManaged, suggestionList } from "@/lib/categories";
import { priorityMeta } from "@/lib/tasks";
import type { Category, RecurringTask, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "open" | "done" | "all";
type Sort = "handmatig" | "prioriteit" | "deadline";

// Sorteert op deadline: vroegste eerst, taken zonder deadline achteraan.
function dueCompare(a: Task, b: Task) {
  if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn);
  if (a.dueOn) return -1;
  if (b.dueOn) return 1;
  return 0;
}

export function TasksView({
  tasks,
  todayKey,
  preview,
  categories = [],
  recurringTasks = [],
}: {
  tasks: Task[];
  todayKey: string;
  preview: boolean;
  categories?: Category[];
  recurringTasks?: RecurringTask[];
}) {
  const [filter, setFilter] = useState<Filter>("open");
  const [sort, setSort] = useState<Sort>("handmatig");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const openCount = useMemo(
    () => tasks.filter((task) => !task.done).length,
    [tasks],
  );

  const colorByName = useMemo(
    () => new Map(categories.map((category) => [category.name, category.color])),
    [categories],
  );

  const inUseCategories = useMemo(
    () =>
      Array.from(
        new Set(
          tasks.map((task) => task.category).filter((c): c is string => !!c),
        ),
      ),
    [tasks],
  );

  // Filterbalk: enkel categorieën in gebruik, in de beheerde volgorde.
  const filterCategories = useMemo(
    () => orderByManaged(inUseCategories, categories),
    [inUseCategories, categories],
  );

  // Editor-suggesties: alle beheerde categorieën (ook ongebruikte) eerst.
  const editorCategories = useMemo(
    () => suggestionList(inUseCategories, categories),
    [categories, inUseCategories],
  );

  const visible = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const byStatus =
        filter === "all" ? true : filter === "open" ? !task.done : task.done;
      const byCategory = !activeCategory || task.category === activeCategory;
      return byStatus && byCategory;
    });
    const idx = new Map(localOrder.map((id, index) => [id, index]));
    return [...filtered].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1; // open eerst
      if (sort === "prioriteit") {
        const diff =
          priorityMeta(a.priority).order - priorityMeta(b.priority).order;
        if (diff !== 0) return diff;
        return dueCompare(a, b);
      }
      if (sort === "deadline") {
        return dueCompare(a, b);
      }
      // handmatig: optimistische volgorde, anders de bewaarde position.
      const ai = idx.get(a.id) ?? 1e6 + a.position;
      const bi = idx.get(b.id) ?? 1e6 + b.position;
      return ai - bi;
    });
  }, [tasks, filter, sort, activeCategory, localOrder]);

  // Taken gegroepeerd per categorie (beheerde volgorde) voor de kaart-indeling,
  // zoals het notitietabblad.
  const grouped = useMemo(
    () => groupTasksByCategory(visible, categories),
    [visible, categories],
  );

  // Optimistische volgorde van de categoriekaarten (tot de server-revalidatie de
  // beheerde volgorde bijwerkt). "Zonder categorie" blijft altijd achteraan.
  const [cardOrder, setCardOrder] = useState<string[] | null>(null);
  const orderedGroups = useMemo(() => {
    if (!cardOrder) return grouped;
    const idx = new Map(cardOrder.map((id, index) => [id, index]));
    return [...grouped].sort((a, b) => {
      if (a.name === null) return 1;
      if (b.name === null) return -1;
      return (idx.get(a.name) ?? 1e6) - (idx.get(b.name) ?? 1e6);
    });
  }, [grouped, cardOrder]);

  // Kaarten verslepen heeft enkel zin bij ≥2 echte categorieën.
  const cardsReorderable =
    grouped.filter((group) => group.name !== null).length >= 2;

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setEditorOpen(true);
  }

  function exportTasks() {
    window.location.href = "/api/tasks/export";
  }

  // Verslepen binnen één categoriekaart: herorden enkel die categorie en behoud
  // de globale volgorde (elke categorie houdt haar eigen plekken in de lijst).
  function onCardDragEnd(event: DragEndEvent, cardIds: string[]) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cardIds.indexOf(active.id as string);
    const newIndex = cardIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newCardIds = arrayMove(cardIds, oldIndex, newIndex);
    const cardSet = new Set(cardIds);
    let k = 0;
    const result = visible.map((task) =>
      cardSet.has(task.id) ? newCardIds[k++] : task.id,
    );
    setLocalOrder(result);
    void reorderTasks(result).then((res) => {
      if (!res.ok) {
        toast.error("Volgorde opslaan mislukt", { description: res.error });
      }
    });
  }

  // Verslepen van een categoriekaart → past de beheerde categorievolgorde aan.
  function onCardSortEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentOrder = orderedGroups.map((group) => group.name ?? "__zonder");
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
    setCardOrder(newOrder); // optimistisch

    // Persisteer enkel de echte categorieën; ongebruikte categorieën (niet als
    // kaart zichtbaar) houden hun plek in de beheerde lijst.
    const idByName = new Map(categories.map((c) => [c.name, c.id]));
    const newVisibleIds = newOrder
      .filter((name) => name !== "__zonder" && idByName.has(name))
      .map((name) => idByName.get(name) as string);
    if (newVisibleIds.length === 0) return;
    const visibleIdSet = new Set(newVisibleIds);
    let k = 0;
    const result = categories
      .map((c) => c.id)
      .map((id) => (visibleIdSet.has(id) ? newVisibleIds[k++] : id));
    void reorderCategories("task", result).then((res) => {
      if (!res.ok) {
        toast.error("Volgorde opslaan mislukt", { description: res.error });
      }
    });
  }

  if (preview) {
    return (
      <div>
        <PageHeader
          title="Taken"
          description="Je to-do's met prioriteit en deadlines."
        >
          <Button disabled>
            <Plus className="size-4" /> Nieuwe taak
          </Button>
        </PageHeader>
        <EmptyState
          icon={ListTodo}
          title="Preview-modus"
          description="Koppel Supabase om taken bij te houden."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Taken"
        description="Sleep aan het handvat om de volgorde aan te passen."
      >
        <RecurringTasksButton
          recurringTasks={recurringTasks}
          categories={editorCategories}
        />
        {tasks.length > 0 && (
          <Button variant="outline" onClick={exportTasks}>
            <Download className="size-4" /> Exporteer
          </Button>
        )}
        <Button onClick={openNew}>
          <Plus className="size-4" /> Nieuwe taak
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === "open"} onClick={() => setFilter("open")}>
            Open ({openCount})
          </Chip>
          <Chip active={filter === "done"} onClick={() => setFilter("done")}>
            Afgewerkt
          </Chip>
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            Alles
          </Chip>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Sorteer:</span>
          <Chip active={sort === "handmatig"} onClick={() => setSort("handmatig")}>
            Handmatig
          </Chip>
          <Chip
            active={sort === "prioriteit"}
            onClick={() => setSort("prioriteit")}
          >
            Prioriteit
          </Chip>
          <Chip active={sort === "deadline"} onClick={() => setSort("deadline")}>
            Deadline
          </Chip>
        </div>
      </div>

      {filterCategories.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-muted-foreground">
            Categorie:
          </span>
          <Chip
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          >
            Alle
          </Chip>
          {filterCategories.map((category) => (
            <Chip
              key={category}
              active={activeCategory === category}
              color={colorByName.get(category)}
              onClick={() =>
                setActiveCategory((current) =>
                  current === category ? null : category,
                )
              }
            >
              {category}
            </Chip>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={
            filter === "open"
              ? "Geen openstaande taken"
              : tasks.length === 0
                ? "Nog geen taken"
                : "Niets hier"
          }
          description={
            tasks.length === 0
              ? "Voeg je eerste taak toe."
              : "Pas de filter aan om andere taken te zien."
          }
        >
          {tasks.length === 0 && (
            <Button onClick={openNew}>
              <Plus className="size-4" /> Nieuwe taak
            </Button>
          )}
        </EmptyState>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onCardSortEnd}
        >
          <SortableContext
            items={orderedGroups.map((group) => group.name ?? "__zonder")}
            strategy={rectSortingStrategy}
          >
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {orderedGroups.map((group) => (
                <TaskCategoryCard
                  key={group.name ?? "__zonder"}
                  group={group}
                  cardId={group.name ?? "__zonder"}
                  reorderable={cardsReorderable && group.name !== null}
                  sensors={sensors}
                  sort={sort}
                  todayKey={todayKey}
                  onEdit={openEdit}
                  onTaskDragEnd={onCardDragEnd}
                  exitOnToggle={filter !== "all"}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <TaskEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        task={editing}
        categories={editorCategories}
      />
    </div>
  );
}

// Eén categoriekaart: zelf versleepbaar (kop-handvat → categorievolgorde) met
// daarbinnen de versleepbare takenlijst (binnen de categorie).
function TaskCategoryCard({
  group,
  cardId,
  reorderable,
  sensors,
  sort,
  todayKey,
  onEdit,
  onTaskDragEnd,
  exitOnToggle,
}: {
  group: TaskGroup;
  cardId: string;
  reorderable: boolean;
  sensors: ReturnType<typeof useSensors>;
  sort: Sort;
  todayKey: string;
  onEdit: (task: Task) => void;
  onTaskDragEnd: (event: DragEndEvent, cardIds: string[]) => void;
  exitOnToggle: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cardId, disabled: !reorderable });
  const ids = group.tasks.map((task) => task.id);

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
          {group.tasks.length}
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => onTaskDragEnd(event, ids)}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="divide-y border-t px-3">
            {group.tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                todayKey={todayKey}
                onEdit={onEdit}
                draggable={sort === "handmatig"}
                hideCategory
                categoryColor={group.color}
                exitOnToggle={exitOnToggle}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

type TaskGroup = { name: string | null; color: string | null; tasks: Task[] };

// Groepeert taken per categorie; volgorde volgt de beheerde categorielijst,
// "Zonder categorie" komt achteraan.
function groupTasksByCategory(
  tasks: Task[],
  categories: Category[],
): TaskGroup[] {
  const order = new Map(
    categories.map((category, index) => [category.name, index]),
  );
  const colorOf = new Map(
    categories.map((category) => [category.name, category.color]),
  );
  const buckets = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.category ?? "";
    const list = buckets.get(key);
    if (list) list.push(task);
    else buckets.set(key, [task]);
  }
  const groups: TaskGroup[] = [...buckets.entries()].map(([key, list]) => ({
    name: key || null,
    color: key ? (colorOf.get(key) ?? null) : null,
    tasks: list,
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

function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
      {children}
    </button>
  );
}
