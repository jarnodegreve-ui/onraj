"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { updateSubtasks } from "@/lib/actions/tasks";
import type { Subtask } from "@/lib/types";
import { cn } from "@/lib/utils";

// Afvinkbare deelstappen binnen een taak. De client is de bron van waarheid
// tijdens het bewerken: elke wijziging past optimistisch de volledige lijst aan
// en schrijft die in één keer weg (rolt terug bij een fout).
export function SubtaskList({
  taskId,
  initial,
}: {
  taskId: string;
  initial: Subtask[];
}) {
  const [items, setItems] = useState<Subtask[]>(initial);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();

  // Her-synchroniseer wanneer de server écht andere data levert (bv. taak
  // elders bewerkt). Vergelijk op signatuur — een nieuwe array-referentie per
  // render mag de optimistische staat niet wissen.
  const sig = JSON.stringify(initial);
  const [syncedSig, setSyncedSig] = useState(sig);
  if (syncedSig !== sig) {
    setSyncedSig(sig);
    setItems(initial);
  }

  function persist(next: Subtask[], prev: Subtask[], failMsg: string) {
    setItems(next);
    startTransition(async () => {
      const result = await updateSubtasks(taskId, next);
      if (!result.ok) {
        setItems(prev);
        toast.error(failMsg, { description: result.error });
      }
    });
  }

  function toggle(id: string) {
    persist(
      items.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
      items,
      "Bijwerken mislukt",
    );
  }

  function remove(id: string) {
    persist(
      items.filter((s) => s.id !== id),
      items,
      "Verwijderen mislukt",
    );
  }

  function add() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    persist(
      [...items, { id: crypto.randomUUID(), title, done: false }],
      items,
      "Toevoegen mislukt",
    );
  }

  const done = items.filter((s) => s.done).length;

  return (
    <div className="space-y-1.5">
      {items.length > 0 && (
        <p className="text-xs font-medium text-muted-foreground">
          Checklist · <span className="tabular-nums">{done}</span>/
          <span className="tabular-nums">{items.length}</span>
        </p>
      )}

      {items.length > 0 && (
        <ul className="space-y-0.5">
          {items.map((subtask) => (
            <li key={subtask.id} className="group flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle(subtask.id)}
                aria-label={subtask.done ? "Heropenen" : "Afvinken"}
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                  subtask.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 hover:border-primary",
                )}
              >
                {subtask.done && (
                  <Check className="size-3 animate-in zoom-in-50 duration-200" />
                )}
              </button>
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm break-words",
                  subtask.done && "text-muted-foreground line-through",
                )}
              >
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => remove(subtask.id)}
                aria-label="Deelstap verwijderen"
                className="shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Plus className="size-3.5 shrink-0 text-muted-foreground/60" />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="Deelstap toevoegen…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}
