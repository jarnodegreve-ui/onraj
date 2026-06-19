"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { TASK_PRIORITIES } from "@/lib/tasks";
import type { Task, TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskEditor({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Taak bewerken" : "Nieuwe taak"}</DialogTitle>
          <DialogDescription>Wat moet er gebeuren?</DialogDescription>
        </DialogHeader>
        <TaskForm
          key={task?.id ?? "nieuw"}
          task={task}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [dueOn, setDueOn] = useState(task?.dueOn ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "middel",
  );
  const [pending, startTransition] = useTransition();

  function save() {
    if (!title.trim()) {
      toast.error("Geef een titel.");
      return;
    }
    startTransition(async () => {
      const input = { title, dueOn: dueOn || null, notes, priority };
      const result = task
        ? await updateTask(task.id, input)
        : await createTask(input);
      if (result.ok) {
        toast.success(task ? "Taak bijgewerkt" : "Taak toegevoegd");
        onClose();
      } else {
        toast.error("Opslaan mislukt", { description: result.error });
      }
    });
  }

  return (
    <>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="task-title">Titel</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bijv. offerte nakijken"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="task-due">Deadline (optioneel)</Label>
          <Input
            id="task-due"
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Prioriteit</Label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {[...TASK_PRIORITIES]
              .sort((a, b) => b.order - a.order)
              .map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                    priority === option.value
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  {option.label}
                </button>
              ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="task-notes">Notities (optioneel)</Label>
          <Textarea
            id="task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-20"
          />
        </div>
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
