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
import { createHolding, updateHolding } from "@/lib/actions/investments";
import type { Holding } from "@/lib/types";

export function HoldingEditor({
  open,
  onOpenChange,
  holding,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: Holding | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {holding ? "Belegging bewerken" : "Nieuwe belegging"}
          </DialogTitle>
          <DialogDescription>
            Een aandeel of ETF met het aantal stuks dat je bezit.
          </DialogDescription>
        </DialogHeader>
        <HoldingForm
          key={holding?.id ?? "nieuw"}
          holding={holding}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function HoldingForm({
  holding,
  onClose,
}: {
  holding: Holding | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(holding?.name ?? "");
  const [ticker, setTicker] = useState(holding?.ticker ?? "");
  const [quantity, setQuantity] = useState(
    holding ? String(holding.quantity) : "",
  );
  const [costBasis, setCostBasis] = useState(
    holding?.costBasis != null ? String(holding.costBasis) : "",
  );
  const [note, setNote] = useState(holding?.note ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    const qty = Number(quantity.replace(",", "."));
    const cost = costBasis.trim() ? Number(costBasis.replace(",", ".")) : null;
    if (!name.trim()) {
      toast.error("Geef een naam.");
      return;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Vul een geldig aantal in.");
      return;
    }
    if (cost != null && (!Number.isFinite(cost) || cost < 0)) {
      toast.error("Vul een geldige inleg in.");
      return;
    }

    startTransition(async () => {
      const input = {
        name,
        ticker,
        quantity: qty,
        costBasis: cost,
        note,
      };
      const result = holding
        ? await updateHolding(holding.id, input)
        : await createHolding(input);
      if (result.ok) {
        toast.success(holding ? "Belegging bijgewerkt" : "Belegging toegevoegd");
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
          <Label htmlFor="h-name">Naam</Label>
          <Input
            id="h-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bv. Vanguard FTSE All-World"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="h-ticker">Ticker (optioneel)</Label>
            <Input
              id="h-ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="VWCE"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="h-qty">Aantal stuks</Label>
            <Input
              id="h-qty"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="h-cost">Inleg / aankoopwaarde (€, optioneel)</Label>
          <Input
            id="h-cost"
            inputMode="decimal"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            placeholder="Totaal betaald — voor je rendement"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="h-note">Notitie (optioneel)</Label>
          <Input
            id="h-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="bv. broker, rekening…"
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
