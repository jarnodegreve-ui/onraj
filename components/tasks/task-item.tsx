"use client";

import { useTransition } from "react";
import { Check, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTask, setTaskDone } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/format";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskItem({
  task,
  todayKey,
  onEdit,
}: {
  task: Task;
  todayKey: string;
  onEdit: (task: Task) => void;
}) {
  const [pending, startTransition] = useTransition();
  const overdue = !task.done && !!task.dueOn && task.dueOn < todayKey;

  function toggle() {
    startTransition(async () => {
      const result = await setTaskDone(task.id, !task.done);
      if (!result.ok) toast.error("Mislukt", { description: result.error });
    });
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
    <li className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={task.done ? "Heropenen" : "Afvinken"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          task.done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {task.done && <Check className="size-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            task.done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        {task.dueOn && (
          <span
            className={cn(
              "text-xs",
              overdue
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground",
            )}
          >
            {overdue ? "Te laat · " : ""}
            {formatDate(task.dueOn)}
          </span>
        )}
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
