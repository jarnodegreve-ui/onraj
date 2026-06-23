"use client";

import { useMemo, useState } from "react";
import {
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
  ArrowDownUp,
  Check,
  ChevronDown,
  Download,
  GripVertical,
  ListTodo,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RecurringTasksButton } from "@/components/tasks/recurring-tasks-dialog";
import { TaskEditor } from "@/components/tasks/task-editor";
import { TaskItem } from "@/components/tasks/task-item";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reorderCategories } from "@/lib/actions/categories";
import { reorderTasks } from "@/lib/actions/reorder";
import { setTaskCategory } from "@/lib/actions/tasks";
import { orderByManaged, suggestionList } from "@/lib/categories";
import { priorityMeta } from "@/lib/tasks";
import type { Category, RecurringTask, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "open" | "done" | "all";
type Sort = "handmatig" | "prioriteit" | "deadline";

const SORTS: Sort[] = ["prioriteit", "deadline", "handmatig"];
const SORT_LABELS: Record<Sort, string> = {
  prioriteit: "Prioriteit",
  deadline: "Deadline",
  handmatig: "Handmatig",
};

const ZONDER = "__zonder";
function columnKey(name: string | null) {
  return name ?? ZONDER;
}

// Sorteert op deadline: vroegste eerst, taken zonder deadline achteraan.
function dueCompare(a: Task, b: Task) {
  if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn);
  if (a.dueOn) return -1;
  if (b.dueOn) return 1;
  return 0;
}

// Sleep een kaart → kolomdroppables; sleep een taak → kolom-containers + taken.
const collision: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  const isCard = activeId.startsWith("card:");
  const containers = args.droppableContainers.filter((c) => {
    const id = String(c.id);
    return isCard ? id.startsWith("card:") : !id.startsWith("card:");
  });
  return closestCorners({ ...args, droppableContainers: containers });
};

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
  const [sort, setSort] = useState<Sort>("prioriteit");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [cardOrder, setCardOrder] = useState<string[] | null>(null);
  const [catOverride, setCatOverride] = useState<Record<string, string | null>>(
    {},
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // Wis de optimistische hercategorisatie zodra de server nieuwe data levert.
  const [prevTasks, setPrevTasks] = useState(tasks);
  if (prevTasks !== tasks) {
    setPrevTasks(tasks);
    setCatOverride({});
  }

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

  // Optimistische hercategorisatie toepassen vóór het groeperen.
  const visibleWithOverride = useMemo(
    () =>
      visible.map((task) =>
        task.id in catOverride
          ? { ...task, category: catOverride[task.id] }
          : task,
      ),
    [visible, catOverride],
  );

  const grouped = useMemo(
    () => groupTasksByCategory(visibleWithOverride, categories),
    [visibleWithOverride, categories],
  );

  // "Zonder categorie" blijft achteraan; echte categorieën in de optimistische
  // kaartvolgorde (tot de server-revalidatie de beheerde volgorde bijwerkt).
  const orderedGroups = useMemo(() => {
    if (!cardOrder) return grouped;
    const idx = new Map(cardOrder.map((id, index) => [id, index]));
    return [...grouped].sort((a, b) => {
      if (a.name === null) return 1;
      if (b.name === null) return -1;
      return (idx.get(a.name) ?? 1e6) - (idx.get(b.name) ?? 1e6);
    });
  }, [grouped, cardOrder]);

  // Welke kolom hoort bij elke taak (incl. optimistische hercategorisatie).
  const colByTask = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of visibleWithOverride) {
      map.set(task.id, columnKey(task.category));
    }
    return map;
  }, [visibleWithOverride]);

  const cardsReorderable =
    grouped.filter((group) => group.name !== null).length >= 2;

  const activeTask = activeTaskId
    ? (visible.find((task) => task.id === activeTaskId) ?? null)
    : null;

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

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveTaskId(id.startsWith("card:") ? null : id);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Kaart verslepen → categorievolgorde.
    if (activeId.startsWith("card:")) {
      if (activeId !== overId) reorderCards(activeId, overId);
      return;
    }

    // Taak verslepen.
    const sourceCol = colByTask.get(activeId);
    if (!sourceCol) return;
    let targetCol: string;
    if (overId.startsWith("col:")) targetCol = overId.slice(4);
    else if (overId.startsWith("card:")) targetCol = overId.slice(5);
    else targetCol = colByTask.get(overId) ?? sourceCol;

    if (targetCol === sourceCol) {
      // Herorden binnen de kolom (enkel zinvol bij handmatig sorteren).
      if (activeId === overId || sort !== "handmatig") return;
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
    const colIds = group.tasks.map((task) => task.id);
    const oldIndex = colIds.indexOf(activeId);
    const newIndex = colIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;
    const newColIds = arrayMove(colIds, oldIndex, newIndex);
    const colSet = new Set(colIds);
    let k = 0;
    const result = visible.map((task) =>
      colSet.has(task.id) ? newColIds[k++] : task.id,
    );
    setLocalOrder(result);
    void reorderTasks(result).then((res) => {
      if (!res.ok) {
        toast.error("Volgorde opslaan mislukt", { description: res.error });
      }
    });
  }

  function recategorize(taskId: string, targetCol: string) {
    const newCat = targetCol === ZONDER ? null : targetCol;
    setCatOverride((prev) => ({ ...prev, [taskId]: newCat }));
    void setTaskCategory(taskId, newCat).then((res) => {
      if (!res.ok) {
        setCatOverride((prev) => {
          const next = { ...prev };
          delete next[taskId];
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
    setCardOrder(newOrder); // optimistisch

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
        description="Sleep taken tussen categorieën of binnen een kaart om te ordenen."
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

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-muted p-0.5">
          <FilterSeg active={filter === "open"} onClick={() => setFilter("open")}>
            Open <span className="tabular-nums opacity-70">{openCount}</span>
          </FilterSeg>
          <FilterSeg active={filter === "done"} onClick={() => setFilter("done")}>
            Afgewerkt
          </FilterSeg>
          <FilterSeg active={filter === "all"} onClick={() => setFilter("all")}>
            Alles
          </FilterSeg>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="shrink-0">
                <ArrowDownUp className="size-3.5" />
                {SORT_LABELS[sort]}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {SORTS.map((option) => (
              <DropdownMenuItem key={option} onClick={() => setSort(option)}>
                {SORT_LABELS[option]}
                {sort === option && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filterCategories.length > 0 && (
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          <Chip
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
            className="shrink-0"
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
              className="shrink-0"
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
          collisionDetection={collision}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={orderedGroups.map((group) => `card:${columnKey(group.name)}`)}
            strategy={rectSortingStrategy}
          >
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {orderedGroups.map((group) => (
                <TaskColumn
                  key={columnKey(group.name)}
                  group={group}
                  reorderable={cardsReorderable && group.name !== null}
                  todayKey={todayKey}
                  onEdit={openEdit}
                  exitOnToggle={filter !== "all"}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeTask ? <TaskOverlayRow task={activeTask} /> : null}
          </DragOverlay>
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

// Eén categoriekolom: zelf versleepbaar (kop-handvat → categorievolgorde) en een
// droppable voor taken (slepen erin = hercategoriseren). De takenlijst is een
// SortableContext binnen de gedeelde DndContext (slepen tussen kolommen mogelijk).
function TaskColumn({
  group,
  reorderable,
  todayKey,
  onEdit,
  exitOnToggle,
}: {
  group: TaskGroup;
  reorderable: boolean;
  todayKey: string;
  onEdit: (task: Task) => void;
  exitOnToggle: boolean;
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
  const taskIds = group.tasks.map((task) => task.id);

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
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <ul
          ref={setColRef}
          className={cn(
            "min-h-11 divide-y border-t px-3 transition-colors",
            isOver && "bg-primary/5",
          )}
        >
          {group.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              todayKey={todayKey}
              onEdit={onEdit}
              draggable
              hideCategory
              categoryColor={group.color}
              exitOnToggle={exitOnToggle}
            />
          ))}
          {group.tasks.length === 0 && (
            <li className="py-3 text-center text-xs text-muted-foreground">
              Sleep een taak hierheen
            </li>
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

// Zwevende kopie tijdens het slepen van een taak (buiten de kaart-clipping).
function TaskOverlayRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-xl">
      <span className="size-5 shrink-0 rounded-full border border-muted-foreground/40" />
      <span className="flex-1 truncate text-sm">{task.title}</span>
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: priorityMeta(task.priority).color }}
      />
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

function FilterSeg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
  color,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string | null;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className,
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
