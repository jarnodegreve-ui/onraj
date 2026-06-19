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
import {
  createSavingsGoal,
  updateSavingsGoal,
} from "@/lib/actions/savings";
import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from "@/lib/agenda";
import type { SavingsGoal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SavingsGoalEditor({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: SavingsGoal | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {goal ? "Spaardoel bewerken" : "Nieuw spaardoel"}
          </DialogTitle>
          <DialogDescription>Geef een doel en je voortgang.</DialogDescription>
        </DialogHeader>
        <GoalForm
          key={goal?.id ?? "nieuw"}
          goal={goal}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({
  goal,
  onClose,
}: {
  goal: SavingsGoal | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(goal.targetAmount) : "");
  const [saved, setSaved] = useState(goal ? String(goal.savedAmount) : "0");
  const [color, setColor] = useState(goal?.color ?? DEFAULT_EVENT_COLOR);
  const [pending, startTransition] = useTransition();

  function save() {
    const targetAmount = Number(target.replace(",", "."));
    const savedAmount = Number(saved.replace(",", "."));
    if (!name.trim()) {
      toast.error("Geef een naam.");
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error("Vul een geldig doelbedrag in.");
      return;
    }
    if (!Number.isFinite(savedAmount) || savedAmount < 0) {
      toast.error("Vul een geldig gespaard bedrag in.");
      return;
    }

    startTransition(async () => {
      const input = { name, targetAmount, savedAmount, color };
      const result = goal
        ? await updateSavingsGoal(goal.id, input)
        : await createSavingsGoal(input);
      if (result.ok) {
        toast.success(goal ? "Spaardoel bijgewerkt" : "Spaardoel toegevoegd");
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
          <Label htmlFor="sg-name">Naam</Label>
          <Input
            id="sg-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bv. Nieuwe laptop"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="sg-target">Doelbedrag (€)</Label>
            <Input
              id="sg-target"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-saved">Gespaard (€)</Label>
            <Input
              id="sg-saved"
              inputMode="decimal"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Kleur</Label>
          <div className="flex gap-2">
            {EVENT_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={option.name}
                onClick={() => setColor(option.value)}
                className={cn(
                  "size-7 rounded-full ring-offset-2 ring-offset-background transition",
                  color === option.value && "ring-2 ring-foreground",
                )}
                style={{ backgroundColor: option.value }}
              />
            ))}
          </div>
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
