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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Download, ListTodo, Plus } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TaskEditor } from "@/components/tasks/task-editor";
import { TaskItem } from "@/components/tasks/task-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reorderTasks } from "@/lib/actions/reorder";
import { orderByManaged, suggestionList } from "@/lib/categories";
import { priorityMeta } from "@/lib/tasks";
import type { Category, Task } from "@/lib/types";
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
}: {
  tasks: Task[];
  todayKey: string;
  preview: boolean;
  categories?: Category[];
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

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = visible.map((task) => task.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    setLocalOrder(newIds);
    void reorderTasks(newIds).then((result) => {
      if (!result.ok) {
        toast.error("Volgorde opslaan mislukt", { description: result.error });
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
        <Card>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={visible.map((task) => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="divide-y">
                  {visible.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      todayKey={todayKey}
                      onEdit={openEdit}
                      draggable={sort === "handmatig" && activeCategory === null}
                      categoryColor={
                        task.category ? colorByName.get(task.category) : undefined
                      }
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
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
