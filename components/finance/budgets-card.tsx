"use client";

import { useMemo, useState, useTransition } from "react";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BudgetEditor } from "@/components/finance/budget-editor";
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
import { deleteBudget } from "@/lib/actions/budgets";
import type { CategorySlice } from "@/lib/finance";
import { formatEuro } from "@/lib/format";
import type { Budget } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BudgetsCard({
  budgets,
  spentByCategory,
  categories,
}: {
  budgets: Budget[];
  spentByCategory: CategorySlice[];
  categories: string[];
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const spentMap = useMemo(
    () => new Map(spentByCategory.map((slice) => [slice.category, slice.amount])),
    [spentByCategory],
  );

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(budget: Budget) {
    setEditing(budget);
    setEditorOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budgetten</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus className="size-4" /> Budget
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {budgets.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nog geen budgetten — stel er een in om je uitgaven te bewaken.
          </p>
        ) : (
          <ul className="space-y-3.5">
            {budgets.map((budget) => {
              const spent = spentMap.get(budget.category) ?? 0;
              const pct =
                budget.amount > 0
                  ? Math.min((spent / budget.amount) * 100, 100)
                  : 0;
              const over = spent > budget.amount;
              const rest = budget.amount - spent;
              return (
                <li key={budget.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">
                      {budget.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="tabular-nums text-muted-foreground">
                        {formatEuro(spent)} / {formatEuro(budget.amount)}
                      </span>
                      <BudgetMenu budget={budget} onEdit={openEdit} />
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        over
                          ? "bg-neg"
                          : pct > 80
                            ? "bg-amber-500"
                            : "bg-pos",
                      )}
                      style={{ width: `${over ? 100 : pct}%` }}
                    />
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      over
                        ? "text-neg"
                        : "text-muted-foreground",
                    )}
                  >
                    {over
                      ? `${formatEuro(-rest)} over budget`
                      : `${formatEuro(rest)} resterend`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <BudgetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        budget={editing}
        categories={categories}
      />
    </Card>
  );
}

function BudgetMenu({
  budget,
  onEdit,
}: {
  budget: Budget;
  onEdit: (budget: Budget) => void;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Dit budget verwijderen?")) return;
    startTransition(async () => {
      const result = await deleteBudget(budget.id);
      if (result.ok) toast.success("Budget verwijderd");
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
        <DropdownMenuItem onClick={() => onEdit(budget)}>
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
