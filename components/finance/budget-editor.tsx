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
import { createBudget, updateBudget } from "@/lib/actions/budgets";
import type { Budget } from "@/lib/types";

export function BudgetEditor({
  open,
  onOpenChange,
  budget,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
  categories: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {budget ? "Budget bewerken" : "Budget instellen"}
          </DialogTitle>
          <DialogDescription>Maandbudget voor een categorie.</DialogDescription>
        </DialogHeader>
        <BudgetForm
          key={budget?.id ?? "nieuw"}
          budget={budget}
          categories={categories}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function BudgetForm({
  budget,
  categories,
  onClose,
}: {
  budget: Budget | null;
  categories: string[];
  onClose: () => void;
}) {
  const [category, setCategory] = useState(budget?.category ?? "");
  const [amount, setAmount] = useState(budget ? String(budget.amount) : "");
  const [pending, startTransition] = useTransition();

  function save() {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!category.trim()) {
      toast.error("Geef een categorie.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Vul een geldig bedrag in.");
      return;
    }
    startTransition(async () => {
      const input = { category, amount: parsedAmount };
      const result = budget
        ? await updateBudget(budget.id, input)
        : await createBudget(input);
      if (result.ok) {
        toast.success(budget ? "Budget bijgewerkt" : "Budget ingesteld");
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
          <Label htmlFor="budget-cat">Categorie</Label>
          <Input
            id="budget-cat"
            list="budget-cats"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="bv. Boodschappen"
            disabled={!!budget}
          />
          <datalist id="budget-cats">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="budget-amount">Maandbudget (€)</Label>
          <Input
            id="budget-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
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
