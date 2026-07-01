"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RecurringEditor } from "@/components/finance/recurring-editor";
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
import { deleteRecurring, setRecurringActive } from "@/lib/actions/recurring";
import { formatEuro } from "@/lib/format";
import { monthLabel } from "@/lib/month";
import type { RecurringTransaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RecurringCard({
  recurring,
  categories,
}: {
  recurring: RecurringTransaction[];
  categories: string[];
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(item: RecurringTransaction) {
    setEditing(item);
    setEditorOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vaste posten</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus className="size-4" /> Toevoegen
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {recurring.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nog geen vaste posten. Voeg loon of abonnementen toe — ze verschijnen
            dan automatisch elke maand.
          </p>
        ) : (
          <ul className="divide-y">
            {recurring.map((item) => (
              <RecurringRow key={item.id} recurring={item} onEdit={openEdit} />
            ))}
          </ul>
        )}
      </CardContent>

      <RecurringEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        recurring={editing}
        categories={categories}
      />
    </Card>
  );
}

function RecurringRow({
  recurring,
  onEdit,
}: {
  recurring: RecurringTransaction;
  onEdit: (item: RecurringTransaction) => void;
}) {
  const [pending, startTransition] = useTransition();
  const income = recurring.direction === "inkomst";

  function toggleActive() {
    startTransition(async () => {
      const result = await setRecurringActive(recurring.id, !recurring.active);
      if (!result.ok) toast.error("Mislukt", { description: result.error });
    });
  }

  function remove() {
    if (
      !window.confirm(
        "Deze vaste post verwijderen? Reeds aangemaakte transacties blijven staan.",
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteRecurring(recurring.id);
      if (result.ok) toast.success("Vaste post verwijderd");
      else toast.error("Verwijderen mislukt", { description: result.error });
    });
  }

  return (
    <li
      className={cn(
        "flex items-center gap-3 py-3",
        !recurring.active && "opacity-50",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {recurring.description ||
            recurring.category ||
            (income ? "Inkomst" : "Uitgave")}
        </p>
        <p className="text-xs text-muted-foreground">
          Elke maand · dag {recurring.dayOfMonth}
          {recurring.category && ` · ${recurring.category}`}
          {recurring.endMonth && ` · t/m ${monthLabel(recurring.endMonth, "MMM yyyy")}`}
          {!recurring.active && " · gepauzeerd"}
        </p>
      </div>

      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          income ? "text-pos" : "text-foreground",
        )}
      >
        {income ? "+" : "−"} {formatEuro(recurring.amount)}
      </span>

      <button
        type="button"
        onClick={toggleActive}
        disabled={pending}
        aria-label={recurring.active ? "Pauzeren" : "Activeren"}
        className="rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {recurring.active ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </button>

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
          <DropdownMenuItem onClick={() => onEdit(recurring)}>
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
