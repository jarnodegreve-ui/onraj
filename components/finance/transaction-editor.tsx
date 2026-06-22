"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Attachments } from "@/components/attachments";
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
import {
  createTransaction,
  updateTransaction,
} from "@/lib/actions/transactions";
import type { TransactieRichting, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TransactionEditor({
  open,
  onOpenChange,
  transaction,
  defaultDate,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  defaultDate: string;
  categories: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Transactie bewerken" : "Nieuwe transactie"}
          </DialogTitle>
          <DialogDescription>
            Registreer een inkomst of uitgave.
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          key={transaction?.id ?? `nieuw-${defaultDate}`}
          transaction={transaction}
          defaultDate={defaultDate}
          categories={categories}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  transaction,
  defaultDate,
  categories,
  onClose,
}: {
  transaction: Transaction | null;
  defaultDate: string;
  categories: string[];
  onClose: () => void;
}) {
  const [occurredOn, setOccurredOn] = useState(
    transaction?.occurredOn ?? defaultDate,
  );
  const [direction, setDirection] = useState<TransactieRichting>(
    transaction?.direction ?? "uitgave",
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : "",
  );
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );
  const [account, setAccount] = useState(transaction?.account ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Vul een geldig bedrag in.");
      return;
    }

    startTransition(async () => {
      const input = {
        occurredOn,
        amount: parsedAmount,
        direction,
        category,
        description,
        account,
      };
      const result = transaction
        ? await updateTransaction(transaction.id, input)
        : await createTransaction(input);

      if (result.ok) {
        toast.success(
          transaction ? "Transactie bijgewerkt" : "Transactie toegevoegd",
        );
        onClose();
      } else {
        toast.error("Opslaan mislukt", { description: result.error });
      }
    });
  }

  return (
    <>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <SegButton
            active={direction === "uitgave"}
            onClick={() => setDirection("uitgave")}
            activeClassName="bg-rose-500/15 text-rose-600 ring-1 ring-inset ring-rose-500/30 dark:text-rose-300"
          >
            Uitgave
          </SegButton>
          <SegButton
            active={direction === "inkomst"}
            onClick={() => setDirection("inkomst")}
            activeClassName="bg-emerald-500/15 text-emerald-600 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300"
          >
            Inkomst
          </SegButton>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="tx-date">Datum</Label>
            <Input
              id="tx-date"
              type="date"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tx-amount">Bedrag (€)</Label>
            <Input
              id="tx-amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tx-category">Categorie</Label>
          <Input
            id="tx-category"
            list="tx-categories"
            placeholder="bv. Boodschappen"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <datalist id="tx-categories">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tx-desc">Omschrijving</Label>
          <Input
            id="tx-desc"
            placeholder="Optioneel"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tx-account">Rekening</Label>
          <Input
            id="tx-account"
            placeholder="Optioneel"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
          />
        </div>

        {transaction && (
          <Attachments entityType="transaction" entityId={transaction.id} />
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

function SegButton({
  active,
  onClick,
  activeClassName,
  children,
}: {
  active: boolean;
  onClick: () => void;
  activeClassName: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? cn("shadow-sm", activeClassName)
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
