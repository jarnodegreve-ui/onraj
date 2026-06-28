"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Flag, Plus, Tag } from "lucide-react";
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
import { listTaskCategoryNames } from "@/lib/actions/categories";
import { createNote } from "@/lib/actions/notes";
import { createTask } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/format";
import { TASK_PRIORITIES, priorityMeta } from "@/lib/tasks";
import type { TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "note" | "task";

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("note");

  const openWith = useCallback((next: Mode) => {
    setMode(next);
    setOpen(true);
  }, []);

  // Sneltoetsen: n = nieuwe notitie, t = nieuwe taak (niet tijdens typen).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "n") {
        event.preventDefault();
        openWith("note");
      } else if (event.key === "t") {
        event.preventDefault();
        openWith("task");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openWith]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openWith("note")}
        aria-label="Snel toevoegen"
      >
        <Plus className="size-4" />
        <span className="hidden sm:inline">Toevoegen</span>
      </Button>

      <QuickAddDialog open={open} onOpenChange={setOpen} mode={mode} />
    </>
  );
}

export function QuickAddDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mobiel: hoger ankeren (gecentreerd boven het toetsenbord); desktop: centraal. */}
      <DialogContent className="top-[8%] max-h-[88dvh] translate-y-0 overflow-y-auto sm:top-1/2 sm:max-w-md sm:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Snel toevoegen</DialogTitle>
          <DialogDescription>
            Maak snel een notitie of taak aan. Tip: druk op{" "}
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">
              n
            </kbd>{" "}
            of{" "}
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">
              t
            </kbd>
            .
          </DialogDescription>
        </DialogHeader>
        <QuickForm
          key={mode}
          initialMode={mode}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function QuickForm({
  initialMode,
  onClose,
}: {
  initialMode: Mode;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("middel");
  const [expanded, setExpanded] = useState<
    "date" | "priority" | "category" | null
  >(null);
  const [pending, startTransition] = useTransition();

  // Beheerde taak-categorieën lazy laden voor de snelkeuze-chips.
  useEffect(() => {
    listTaskCategoryNames()
      .then(setCategories)
      .catch(() => {});
  }, []);

  function save() {
    if (mode === "task" && !title.trim()) {
      toast.error("Geef een titel.");
      return;
    }
    if (mode === "note" && !title.trim() && !body.trim()) {
      toast.error("Geef een titel of inhoud.");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "note"
          ? await createNote({ title, body, tags: [], pinned: false })
          : await createTask({
              title,
              dueOn: dueOn || null,
              notes: body,
              priority,
              category: category.trim() || null,
            });

      if (result.ok) {
        toast.success(mode === "note" ? "Notitie toegevoegd" : "Taak toegevoegd");
        onClose();
        router.refresh();
      } else {
        toast.error("Opslaan mislukt", { description: result.error });
      }
    });
  }

  const prio = priorityMeta(priority);

  function toggleField(field: "date" | "priority" | "category") {
    setExpanded((current) => (current === field ? null : field));
  }

  return (
    <>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <SegButton active={mode === "note"} onClick={() => setMode("note")}>
            Notitie
          </SegButton>
          <SegButton active={mode === "task"} onClick={() => setMode("task")}>
            Taak
          </SegButton>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="qa-title">Titel</Label>
          <Input
            id="qa-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              mode === "note" ? "Titel van je notitie" : "Wat moet er gebeuren?"
            }
          />
        </div>

        {mode === "note" ? (
          <div className="grid gap-2">
            <Label htmlFor="qa-body">Inhoud</Label>
            <Textarea
              id="qa-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Optioneel — markdown wordt ondersteund"
              className="min-h-24"
            />
          </div>
        ) : (
          <>
            <Textarea
              id="qa-notes"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Omschrijving (optioneel)"
              className="min-h-16"
            />

            {/* Compacte balk: tik een icoon om deadline, prioriteit of
                categorie uit te klappen — i.p.v. gestapelde velden. */}
            <div className="flex flex-wrap items-center gap-2">
              <FieldToggle
                label="Deadline"
                active={expanded === "date"}
                set={!!dueOn}
                onClick={() => toggleField("date")}
              >
                <CalendarDays className="size-4" />
                {dueOn && (
                  <span className="tabular-nums">
                    {formatDate(dueOn, "d MMM")}
                  </span>
                )}
              </FieldToggle>
              <FieldToggle
                label="Prioriteit"
                active={expanded === "priority"}
                set={priority !== "middel"}
                onClick={() => toggleField("priority")}
              >
                <Flag className="size-4" style={{ color: prio.color }} />
                {priority !== "middel" && <span>{prio.label}</span>}
              </FieldToggle>
              {categories.length > 0 && (
                <FieldToggle
                  label="Categorie"
                  active={expanded === "category"}
                  set={!!category}
                  onClick={() => toggleField("category")}
                >
                  <Tag className="size-4" />
                  {category && (
                    <span className="max-w-28 truncate">{category}</span>
                  )}
                </FieldToggle>
              )}
            </div>

            {expanded === "date" && (
              <Input
                id="qa-due"
                type="date"
                autoFocus
                value={dueOn}
                onChange={(event) => setDueOn(event.target.value)}
              />
            )}

            {expanded === "priority" && (
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
            )}

            {expanded === "category" && categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((name) => {
                  const active = category === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCategory(active ? "" : name)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
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

// Compacte icoon-pil die een veld uitklapt; toont de gekozen waarde inline en
// licht op zodra er iets is ingevuld (denim) of de pil openstaat.
function FieldToggle({
  label,
  active,
  set,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  set: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : set
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-border bg-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SegButton({
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
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
