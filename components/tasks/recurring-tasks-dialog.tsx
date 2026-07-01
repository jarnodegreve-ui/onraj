"use client";

import { useState, useTransition } from "react";
import {
  ChevronLeft,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
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
import {
  createRecurringTask,
  deleteRecurringTask,
  setRecurringTaskActive,
  updateRecurringTask,
} from "@/lib/actions/recurring-tasks";
import { TASK_PRIORITIES } from "@/lib/tasks";
import type {
  RecurringFrequency,
  RecurringTask,
  TaskPriority,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { v: 1, l: "Ma" },
  { v: 2, l: "Di" },
  { v: 3, l: "Wo" },
  { v: 4, l: "Do" },
  { v: 5, l: "Vr" },
  { v: 6, l: "Za" },
  { v: 0, l: "Zo" },
];
const WEEKDAY_FULL = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];

function summary(rt: RecurringTask): string {
  if (rt.frequency === "dagelijks") return "Elke dag";
  if (rt.frequency === "wekelijks")
    return `Elke ${WEEKDAY_FULL[rt.weekday ?? 1]}`;
  return `Maandelijks · dag ${rt.dayOfMonth ?? 1}`;
}

export function RecurringTasksButton({
  recurringTasks,
  categories,
}: {
  recurringTasks: RecurringTask[];
  categories: string[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<RecurringTask | null>(null);

  function toList() {
    setEditing(null);
    setMode("list");
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          toList();
          setOpen(true);
        }}
      >
        <Repeat className="size-4" /> Terugkerend
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {mode === "list" ? (
            <RecurringList
              recurringTasks={recurringTasks}
              onNew={() => {
                setEditing(null);
                setMode("form");
              }}
              onEdit={(rt) => {
                setEditing(rt);
                setMode("form");
              }}
            />
          ) : (
            <RecurringForm
              key={editing?.id ?? "nieuw"}
              recurring={editing}
              categories={categories}
              onBack={toList}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecurringList({
  recurringTasks,
  onNew,
  onEdit,
}: {
  recurringTasks: RecurringTask[];
  onNew: () => void;
  onEdit: (rt: RecurringTask) => void;
}) {
  const [pending, startTransition] = useTransition();

  // De acties revalideren /taken + /dashboard; deze dialog leeft op /taken, dus
  // Next ververst de lijst automatisch — geen router.refresh() nodig.
  function toggle(rt: RecurringTask) {
    startTransition(async () => {
      const result = await setRecurringTaskActive(rt.id, !rt.active);
      if (!result.ok) toast.error("Mislukt", { description: result.error });
    });
  }

  function remove(rt: RecurringTask) {
    if (
      !window.confirm(
        "Deze terugkerende taak verwijderen? Reeds aangemaakte taken blijven staan.",
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteRecurringTask(rt.id);
      if (result.ok) {
        toast.success("Verwijderd");
      } else {
        toast.error("Verwijderen mislukt", { description: result.error });
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Terugkerende taken</DialogTitle>
        <DialogDescription>
          Sjablonen die automatisch een taak aanmaken op hun dag.
        </DialogDescription>
      </DialogHeader>
      {recurringTasks.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Nog geen terugkerende taken. Voeg er een toe — bv. “elke maandag” of
          “de 1e van de maand”.
        </p>
      ) : (
        <ul className="divide-y">
          {recurringTasks.map((rt) => (
            <li
              key={rt.id}
              className={cn(
                "flex items-center gap-2 py-2.5",
                !rt.active && "opacity-50",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{rt.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {summary(rt)}
                  {rt.category && ` · ${rt.category}`}
                  {!rt.active && " · gepauzeerd"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(rt)}
                disabled={pending}
                aria-label={rt.active ? "Pauzeren" : "Activeren"}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {rt.active ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onEdit(rt)}
                aria-label="Bewerken"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(rt)}
                disabled={pending}
                aria-label="Verwijderen"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <DialogFooter>
        <Button onClick={onNew}>
          <Plus className="size-4" /> Nieuwe
        </Button>
      </DialogFooter>
    </>
  );
}

function RecurringForm({
  recurring,
  categories,
  onBack,
}: {
  recurring: RecurringTask | null;
  categories: string[];
  onBack: () => void;
}) {
  const [title, setTitle] = useState(recurring?.title ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    recurring?.priority ?? "middel",
  );
  const [category, setCategory] = useState(recurring?.category ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    recurring?.frequency ?? "wekelijks",
  );
  const [weekday, setWeekday] = useState<number>(recurring?.weekday ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(
    recurring?.dayOfMonth ?? 1,
  );
  const [notes, setNotes] = useState(recurring?.notes ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    if (!title.trim()) {
      toast.error("Geef een titel.");
      return;
    }
    startTransition(async () => {
      const payload = {
        title,
        notes,
        priority,
        category: category.trim() || null,
        frequency,
        weekday: frequency === "wekelijks" ? weekday : null,
        dayOfMonth: frequency === "maandelijks" ? dayOfMonth : null,
      };
      const result = recurring
        ? await updateRecurringTask(recurring.id, payload)
        : await createRecurringTask(payload);
      if (result.ok) {
        toast.success(recurring ? "Bijgewerkt" : "Toegevoegd");
        onBack();
      } else {
        toast.error("Opslaan mislukt", { description: result.error });
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Terug"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          {recurring ? "Terugkerende taak bewerken" : "Nieuwe terugkerende taak"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="rt-title">Titel</Label>
          <Input
            id="rt-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Bijv. weekrapport opmaken"
            autoFocus
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
          <Label>Herhaling</Label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {(["dagelijks", "wekelijks", "maandelijks"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm font-medium capitalize transition-colors",
                  frequency === f
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {frequency === "wekelijks" && (
          <div className="grid gap-2">
            <Label>Welke dag</Label>
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => setWeekday(d.v)}
                  className={cn(
                    "size-9 rounded-md border text-xs font-medium transition-colors",
                    weekday === d.v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {d.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {frequency === "maandelijks" && (
          <div className="grid gap-2">
            <Label htmlFor="rt-dom">Dag van de maand (1–28)</Label>
            <Input
              id="rt-dom"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(event) =>
                setDayOfMonth(
                  Math.min(28, Math.max(1, Number(event.target.value) || 1)),
                )
              }
            />
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="rt-category">Categorie (optioneel)</Label>
          <Input
            id="rt-category"
            list="rt-categories"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Bv. Werk, Privé…"
          />
          <datalist id="rt-categories">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="rt-notes">Notities (optioneel)</Label>
          <Textarea
            id="rt-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-16"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={pending}>
          Terug
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </DialogFooter>
    </>
  );
}
