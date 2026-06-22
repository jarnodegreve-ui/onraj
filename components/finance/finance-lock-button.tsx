"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, ShieldOff } from "lucide-react";
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
  lockFinance,
  removeFinancePin,
  setFinancePin,
} from "@/lib/actions/finance-lock";

export function FinanceLockButton({ pinSet }: { pinSet: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  function lock() {
    startTransition(async () => {
      await lockFinance();
      router.refresh();
    });
  }

  function disable() {
    if (!window.confirm("Pincode-beveiliging uitschakelen?")) return;
    startTransition(async () => {
      const result = await removeFinancePin();
      if (result.ok) {
        toast.success("Beveiliging uitgeschakeld");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function savePin() {
    if (!/^\d{4,8}$/.test(pin)) {
      toast.error("Pincode = 4 tot 8 cijfers.");
      return;
    }
    if (pin !== confirm) {
      toast.error("De pincodes komen niet overeen.");
      return;
    }
    startTransition(async () => {
      const result = await setFinancePin(pin);
      if (result.ok) {
        toast.success("Beveiligd met pincode");
        setOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  if (pinSet) {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={disable} disabled={pending}>
          <ShieldOff className="size-4" /> Beveiliging uit
        </Button>
        <Button variant="outline" size="sm" onClick={lock} disabled={pending}>
          <Lock className="size-4" /> Vergrendelen
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ShieldCheck className="size-4" /> Beveiligen met pincode
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Financiën beveiligen</DialogTitle>
            <DialogDescription>
              Kies een pincode (4–8 cijfers). Daarna vraagt het Financiën-tabblad
              je deze code, en zijn de cijfers op het dashboard verborgen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="new-pin">Pincode</Label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-pin">Herhaal pincode</Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Annuleren
            </Button>
            <Button onClick={savePin} disabled={pending}>
              Instellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
