"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SavingsGoalEditor } from "@/components/finance/savings-goal-editor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSavingsGoal } from "@/lib/actions/savings";
import { DEFAULT_EVENT_COLOR } from "@/lib/agenda";
import { formatEuro } from "@/lib/format";
import type { SavingsGoal } from "@/lib/types";

export function SavingsCard({ goals }: { goals: SavingsGoal[] }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(goal: SavingsGoal) {
    setEditing(goal);
    setEditorOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spaardoelen</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus className="size-4" /> Doel
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nog geen spaardoelen — stel er een in om naartoe te sparen.
          </p>
        ) : (
          <ul className="space-y-3.5">
            {goals.map((goal) => {
              const color = goal.color ?? DEFAULT_EVENT_COLOR;
              const pct =
                goal.targetAmount > 0
                  ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100)
                  : 0;
              const reached = goal.savedAmount >= goal.targetAmount;
              return (
                <li key={goal.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{goal.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="tabular-nums text-muted-foreground">
                        {formatEuro(goal.savedAmount)} /{" "}
                        {formatEuro(goal.targetAmount)}
                      </span>
                      <GoalMenu goal={goal} onEdit={openEdit} />
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {reached
                      ? "Doel bereikt 🎉"
                      : `Nog ${formatEuro(goal.targetAmount - goal.savedAmount)} · ${Math.round(pct)}%`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <SavingsGoalEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        goal={editing}
      />
    </Card>
  );
}

function GoalMenu({
  goal,
  onEdit,
}: {
  goal: SavingsGoal;
  onEdit: (goal: SavingsGoal) => void;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Dit spaardoel verwijderen?")) return;
    startTransition(async () => {
      const result = await deleteSavingsGoal(goal.id);
      if (result.ok) toast.success("Spaardoel verwijderd");
      else toast.error("Verwijderen mislukt", { description: result.error });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Acties"
            disabled={pending}
          >
            <MoreVertical className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(goal)}>
          <Pencil />
          Bewerken
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={remove}>
          <Trash2 />
          Verwijderen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
