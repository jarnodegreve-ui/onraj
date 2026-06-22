"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { setFinancePin, unlockFinance } from "@/lib/actions/finance-lock";

export function FinanceGate({ hasPin }: { hasPin: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!/^\d{4,8}$/.test(pin)) {
      toast.error("Pincode = 4 tot 8 cijfers.");
      return;
    }
    if (!hasPin && pin !== confirm) {
      toast.error("De pincodes komen niet overeen.");
      return;
    }
    startTransition(async () => {
      const result = hasPin
        ? await unlockFinance(pin)
        : await setFinancePin(pin);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-6" />
          </div>
          <CardTitle>
            {hasPin ? "Financiën vergrendeld" : "Financiën beveiligen"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            {hasPin
              ? "Voer je pincode in om je financiën te bekijken."
              : "Stel een pincode in om je financiële gegevens af te schermen."}
          </p>
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="Pincode"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && hasPin) submit();
            }}
          />
          {!hasPin && (
            <Input
              type="password"
              inputMode="numeric"
              placeholder="Herhaal pincode"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          )}
          <Button className="w-full" onClick={submit} disabled={pending}>
            {pending ? "Bezig…" : hasPin ? "Ontgrendelen" : "Instellen"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
