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
  createSubscription,
  updateSubscription,
} from "@/lib/actions/subscriptions";
import type { Subscription, SubscriptionCycle } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SubscriptionEditor({
  open,
  onOpenChange,
  subscription,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {subscription ? "Abonnement bewerken" : "Nieuw abonnement"}
          </DialogTitle>
          <DialogDescription>Wat loopt er en wat kost het?</DialogDescription>
        </DialogHeader>
        <SubForm
          key={subscription?.id ?? "nieuw"}
          subscription={subscription}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function SubForm({
  subscription,
  onClose,
}: {
  subscription: Subscription | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(
    subscription ? String(subscription.amount) : "",
  );
  const [cycle, setCycle] = useState<SubscriptionCycle>(
    subscription?.cycle ?? "maandelijks",
  );
  const [category, setCategory] = useState(subscription?.category ?? "");
  const [nextRenewal, setNextRenewal] = useState(
    subscription?.nextRenewal ?? "",
  );
  const [active, setActive] = useState(subscription?.active ?? true);
  const [note, setNote] = useState(subscription?.note ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    const value = Number(amount.replace(",", "."));
    if (!name.trim()) {
      toast.error("Geef een naam.");
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Vul een geldig bedrag in.");
      return;
    }

    startTransition(async () => {
      const input = {
        name,
        amount: value,
        cycle,
        category,
        nextRenewal: nextRenewal || null,
        active,
        note,
      };
      const result = subscription
        ? await updateSubscription(subscription.id, input)
        : await createSubscription(input);
      if (result.ok) {
        toast.success(
          subscription ? "Abonnement bijgewerkt" : "Abonnement toegevoegd",
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
        <div className="grid gap-2">
          <Label htmlFor="sub-name">Naam</Label>
          <Input
            id="sub-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bv. Spotify"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="sub-amount">Bedrag (€)</Label>
            <Input
              id="sub-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="grid gap-2">
            <Label>Cyclus</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["maandelijks", "jaarlijks"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCycle(option)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                    cycle === option
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sub-category">Categorie (optioneel)</Label>
          <Input
            id="sub-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="bv. Streaming, Verzekering…"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sub-renewal">Volgende vervaldatum (optioneel)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="sub-renewal"
              type="date"
              value={nextRenewal}
              onChange={(e) => setNextRenewal(e.target.value)}
              className="flex-1"
            />
            {nextRenewal && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNextRenewal("")}
              >
                Wissen
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Status</Label>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {[
              { value: true, label: "Actief" },
              { value: false, label: "Gepauzeerd" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setActive(option.value)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                  active === option.value
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sub-note">Notitie (optioneel)</Label>
          <Input
            id="sub-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="bv. gedeeld abonnement"
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
