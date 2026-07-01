"use client";

import { useTransition } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteTransaction,
  restoreTransaction,
} from "@/lib/actions/transactions";
import { formatDate, formatEuro } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TransactionList({
  transactions,
  onEdit,
}: {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
}) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Geen transacties in deze maand.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}

function TransactionRow({
  transaction,
  onEdit,
}: {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
}) {
  const [pending, startTransition] = useTransition();
  const income = transaction.direction === "inkomst";

  function remove() {
    if (!window.confirm("Deze transactie verwijderen?")) return;
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);
      if (result.ok)
        toast.success("Transactie naar prullenbak", {
          action: {
            label: "Ongedaan maken",
            onClick: () =>
              startTransition(async () => {
                const r = await restoreTransaction(transaction.id);
                if (!r.ok)
                  toast.error("Terugzetten mislukt", { description: r.error });
              }),
          },
        });
      else toast.error("Verwijderen mislukt", { description: result.error });
    });
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          income
            ? "bg-pos/10 text-pos"
            : "bg-neg/10 text-neg",
        )}
      >
        {income ? (
          <ArrowDownLeft className="size-4" />
        ) : (
          <ArrowUpRight className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {transaction.description || (income ? "Inkomst" : "Uitgave")}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(transaction.occurredOn)}</span>
          {transaction.category && (
            <Badge variant="secondary" className="font-normal">
              {transaction.category}
            </Badge>
          )}
        </div>
      </div>

      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          income ? "text-pos" : "text-foreground",
        )}
      >
        {income ? "+" : "−"} {formatEuro(transaction.amount)}
      </span>

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
          <DropdownMenuItem onClick={() => onEdit(transaction)}>
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
