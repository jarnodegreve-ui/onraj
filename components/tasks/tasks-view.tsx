"use client";

import { useMemo, useState } from "react";
import { ListTodo, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TaskEditor } from "@/components/tasks/task-editor";
import { TaskItem } from "@/components/tasks/task-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "open" | "done" | "all";

export function TasksView({
  tasks,
  todayKey,
  preview,
}: {
  tasks: Task[];
  todayKey: string;
  preview: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("open");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const openCount = useMemo(
    () => tasks.filter((task) => !task.done).length,
    [tasks],
  );
  const filtered = useMemo(
    () =>
      tasks.filter((task) =>
        filter === "all" ? true : filter === "open" ? !task.done : task.done,
      ),
    [tasks, filter],
  );

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setEditorOpen(true);
  }

  if (preview) {
    return (
      <div>
        <PageHeader title="Taken" description="Je to-do's met deadlines.">
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
      <PageHeader title="Taken" description="Je to-do's met deadlines.">
        <Button onClick={openNew}>
          <Plus className="size-4" /> Nieuwe taak
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1.5">
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

      {filtered.length === 0 ? (
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
            <ul className="divide-y">
              {filtered.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  todayKey={todayKey}
                  onEdit={openEdit}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <TaskEditor open={editorOpen} onOpenChange={setEditorOpen} task={editing} />
    </div>
  );
}

function Chip({
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
        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}
