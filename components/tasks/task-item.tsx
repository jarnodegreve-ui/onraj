"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CategoryBadge } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTask, setTaskDone } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/format";
import { priorityMeta } from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskItem({
  task,
  todayKey,
  onEdit,
  draggable,
  categoryColor,
  hideCategory = false,
  exitOnToggle = false,
}: {
  task: Task;
  todayKey: string;
  onEdit: (task: Task) => void;
  draggable: boolean;
  categoryColor?: string | null;
  hideCategory?: boolean;
  // True wanneer afvinken de taak uit de huidige weergave haalt → wegglijd-effect.
  exitOnToggle?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !draggable });
  const [pending, startTransition] = useTransition();
  const [leaving, setLeaving] = useState(false);
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const shownDone = optimisticDone ?? task.done;
  const overdue = !shownDone && !!task.dueOn && task.dueOn < todayKey;
  const meta = priorityMeta(task.priority);

  // Afvinken: vink optimistisch aan voor directe feedback, laat de regel
  // wegglijden wanneer de taak hierdoor uit de weergave verdwijnt, en markeer
  // dan pas op de server (die de regel daarna uit de lijst haalt).
  function toggle() {
    if (pending || leaving) return;
    const next = !task.done;
    setOptimisticDone(next);
    const commit = () =>
      startTransition(async () => {
        const result = await setTaskDone(task.id, next);
        if (!result.ok) {
          setLeaving(false);
          setOptimisticDone(null);
          toast.error("Mislukt", { description: result.error });
        }
      });
    if (exitOnToggle) {
      setLeaving(true);
      window.setTimeout(commit, 300);
    } else {
      commit();
    }
  }

  function remove() {
    if (!window.confirm("Deze taak verwijderen?")) return;
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.ok) toast.success("Taak verwijderd");
      else toast.error("Verwijderen mislukt", { description: result.error });
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex max-h-20 items-center gap-2.5 py-2.5 transition-all duration-300 ease-out",
        isDragging && "relative z-10 opacity-80",
        leaving &&
          "pointer-events-none max-h-0 translate-x-12 scale-95 overflow-hidden !py-0 opacity-0",
      )}
    >
      {draggable && (
        <button
          type="button"
          className="-ml-1 cursor-grab touch-none text-muted-foreground/60 hover:text-foreground"
          aria-label="Versleep taak"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={pending || leaving}
        aria-label={shownDone ? "Heropenen" : "Afvinken"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          shownDone
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {shownDone && (
          <Check className="size-3.5 animate-in zoom-in-50 duration-200" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm transition-colors",
            shownDone && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 text-xs">
          {task.dueOn && (
            <span
              className={cn(
                overdue
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground",
              )}
            >
              {overdue ? "Te laat · " : ""}
              {formatDate(task.dueOn)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            {meta.label}
          </span>
          {!hideCategory && task.category && (
            <CategoryBadge name={task.category} color={categoryColor} />
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Acties"
              disabled={pending}
            >
              <MoreVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(task)}>
            <Pencil />
            Bewerken
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={remove}>
            <Trash2 />
            Verwijderen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
