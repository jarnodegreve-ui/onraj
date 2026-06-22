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
import { createRecurring, updateRecurring } from "@/lib/actions/recurring";
import type { RecurringTransaction, TransactieRichting } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RecurringEditor({
  open,
  onOpenChange,
  recurring,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring: RecurringTransaction | null;
  categories: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {recurring ? "Vaste post bewerken" : "Nieuwe vaste post"}
          </DialogTitle>
          <DialogDescription>
            Komt elke maand automatisch terug.
          </DialogDescription>
        </DialogHeader>
        <RecurringForm
          key={recurring?.id ?? "nieuw"}
          recurring={recurring}
          categories={categories}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function RecurringForm({
  recurring,
  categories,
  onClose,
}: {
  recurring: RecurringTransaction | null;
  categories: string[];
  onClose: () => void;
}) {
  const [direction, setDirection] = useState<TransactieRichting>(
    recurring?.direction ?? "uitgave",
  );
  const [amount, setAmount] = useState(
    recurring ? String(recurring.amount) : "",
  );
  const [category, setCategory] = useState(recurring?.category ?? "");
  const [description, setDescription] = useState(recurring?.description ?? "");
  const [account, setAccount] = useState(recurring?.account ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(
    String(recurring?.dayOfMonth ?? 1),
  );
  const [pending, startTransition] = useTransition();

  function save() {
    const parsedAmount = Number(amount.replace(",", "."));
    const day = Number(dayOfMonth);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Vul een geldig bedrag in.");
      return;
    }
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      toast.error("Dag moet tussen 1 en 28 liggen.");
      return;
    }
    startTransition(async () => {
      const input = {
        amount: parsedAmount,
        direction,
        category,
        description,
        account,
        dayOfMonth: day,
      };
      const result = recurring
        ? await updateRecurring(recurring.id, input)
        : await createRecurring(input);
      if (result.ok) {
        toast.success(
          recurring ? "Vaste post bijgewerkt" : "Vaste post toegevoegd",
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
            <Label htmlFor="rec-amount">Bedrag (€)</Label>
            <Input
              id="rec-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rec-day">Dag v/d maand</Label>
            <Input
              id="rec-day"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="rec-cat">Categorie</Label>
          <Input
            id="rec-cat"
            list="rec-cats"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="bv. Abonnementen"
          />
          <datalist id="rec-cats">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="rec-desc">Omschrijving</Label>
          <Input
            id="rec-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="bv. Netflix"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="rec-acc">Rekening</Label>
          <Input
            id="rec-acc"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Optioneel"
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
