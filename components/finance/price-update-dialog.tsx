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
import { recordHoldingPrice } from "@/lib/actions/investments";
import { latestPriceByHolding } from "@/lib/investments";
import type { Holding, HoldingPrice } from "@/lib/types";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function PriceUpdateDialog({
  open,
  onOpenChange,
  holdings,
  prices,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdings: Holding[];
  prices: HoldingPrice[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Koersen bijwerken</DialogTitle>
          <DialogDescription>
            Vul de huidige koers per stuk in. Lege velden worden overgeslagen.
          </DialogDescription>
        </DialogHeader>
        <PriceForm
          key={open ? "open" : "closed"}
          holdings={holdings}
          prices={prices}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PriceForm({
  holdings,
  prices,
  onClose,
}: {
  holdings: Holding[];
  prices: HoldingPrice[];
  onClose: () => void;
}) {
  const latest = latestPriceByHolding(prices);
  const [date, setDate] = useState(todayIso());
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      holdings.map((h) => {
        const snapshot = latest.get(h.id);
        return [h.id, snapshot ? String(snapshot.price) : ""];
      }),
    ),
  );
  const [pending, startTransition] = useTransition();

  function setVal(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function save() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("Kies een geldige datum.");
      return;
    }
    const entries = holdings
      .map((h) => ({ id: h.id, raw: (values[h.id] ?? "").trim() }))
      .filter((e) => e.raw !== "")
      .map((e) => ({ id: e.id, price: Number(e.raw.replace(",", ".")) }));

    if (entries.length === 0) {
      toast.error("Vul minstens één koers in.");
      return;
    }
    if (entries.some((e) => !Number.isFinite(e.price) || e.price < 0)) {
      toast.error("Eén van de koersen is ongeldig.");
      return;
    }

    startTransition(async () => {
      const results = await Promise.all(
        entries.map((e) =>
          recordHoldingPrice({
            holdingId: e.id,
            price: e.price,
            recordedOn: date,
          }),
        ),
      );
      const errors = results.flatMap((r) => (r.ok ? [] : [r.error]));
      if (errors.length === 0) {
        toast.success(
          `${entries.length} koers${entries.length > 1 ? "en" : ""} bijgewerkt`,
        );
        onClose();
      } else {
        toast.error("Niet alles is opgeslagen", { description: errors[0] });
      }
    });
  }

  return (
    <>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="pu-date">Datum</Label>
          <Input
            id="pu-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid gap-2.5">
          {holdings.map((h) => (
            <div key={h.id} className="grid grid-cols-[1fr_7rem] items-center gap-3">
              <span className="min-w-0 truncate text-sm">
                {h.name}
                {h.ticker && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {h.ticker}
                  </span>
                )}
              </span>
              <Input
                inputMode="decimal"
                aria-label={`Koers ${h.name}`}
                value={values[h.id] ?? ""}
                onChange={(e) => setVal(h.id, e.target.value)}
                placeholder="€ / stuk"
              />
            </div>
          ))}
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
