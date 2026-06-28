"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { upsertAccountBalance } from "@/lib/actions/accounts";
import { formatEuro } from "@/lib/format";
import type { AccountBalance } from "@/lib/types";

// Snelle suggesties om als rekening toe te voegen aan je vermogen (één tik).
const ACCOUNT_SUGGESTIONS = ["Cash"];

function fmtMonth(monthKey: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    month: "short",
    year: "2-digit",
  }).format(new Date(`${monthKey}-01T00:00:00`));
}

export function AccountsPanel({ balances }: { balances: AccountBalance[] }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [newAccount, setNewAccount] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [pending, startTransition] = useTransition();

  const accounts = useMemo(
    () =>
      Array.from(new Set(balances.map((b) => b.account))).sort((a, b) =>
        a.localeCompare(b, "nl"),
      ),
    [balances],
  );

  // maandKey ('YYYY-MM') -> rekening -> bedrag
  const byMonth = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const balance of balances) {
      const key = balance.month.slice(0, 7);
      let inner = map.get(key);
      if (!inner) {
        inner = new Map();
        map.set(key, inner);
      }
      inner.set(balance.account, balance.amount);
    }
    return map;
  }, [balances]);

  const months = useMemo(
    () => Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a)),
    [byMonth],
  );
  const recentMonths = months.slice(0, 4);
  const latestMonth = months[0] ?? new Date().toISOString().slice(0, 7);

  function prefill(monthKey: string) {
    const key = monthKey.slice(0, 7);
    const monthMap = byMonth.get(key);
    const next: Record<string, string> = {};
    for (const account of accounts) {
      const value = monthMap?.get(account);
      next[account] = value !== undefined ? String(value) : "";
    }
    setAmounts(next);
  }

  function openDialog() {
    setMonth(latestMonth);
    prefill(latestMonth);
    setNewAccount("");
    setNewAmount("");
    setOpen(true);
  }

  function save() {
    const key = month.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) {
      toast.error("Kies een maand.");
      return;
    }
    const monthDate = `${key}-01`;
    const entries: { account: string; amount: number }[] = [];
    for (const account of accounts) {
      const raw = amounts[account]?.trim();
      if (raw) {
        const amount = Number(raw.replace(",", "."));
        if (!Number.isNaN(amount)) entries.push({ account, amount });
      }
    }
    if (newAccount.trim() && newAmount.trim()) {
      const amount = Number(newAmount.replace(",", "."));
      if (!Number.isNaN(amount)) {
        entries.push({ account: newAccount.trim(), amount });
      }
    }
    if (entries.length === 0) {
      toast.error("Vul minstens één bedrag in.");
      return;
    }
    startTransition(async () => {
      const results = await Promise.all(
        entries.map((entry) =>
          upsertAccountBalance({
            account: entry.account,
            month: monthDate,
            amount: entry.amount,
          }),
        ),
      );
      const failed = results.find((result) => !result.ok);
      if (failed && !failed.ok) {
        toast.error("Opslaan mislukt", { description: failed.error });
      } else {
        toast.success(`Saldo's bijgewerkt (${entries.length})`);
        setOpen(false);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-muted-foreground" /> Rekeningen
        </CardTitle>
        <Button size="sm" onClick={openDialog}>
          <Plus className="size-4" /> Saldo&apos;s bijwerken
        </Button>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen rekeningen. Klik op &quot;Saldo&apos;s bijwerken&quot; om te
            beginnen.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Rekening</th>
                  {recentMonths.map((month) => (
                    <th
                      key={month}
                      className="pb-2 pl-4 text-right font-medium tabular-nums"
                    >
                      {fmtMonth(month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {accounts.map((account) => (
                  <tr key={account}>
                    <td className="py-2 font-medium">{account}</td>
                    {recentMonths.map((month) => {
                      const value = byMonth.get(month)?.get(account);
                      return (
                        <td
                          key={month}
                          className="py-2 pl-4 text-right tabular-nums"
                        >
                          {value !== undefined ? formatEuro(value) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 font-semibold">
                  <td className="py-2">Totaal</td>
                  {recentMonths.map((month) => {
                    const sum = accounts.reduce(
                      (total, account) =>
                        total + (byMonth.get(month)?.get(account) ?? 0),
                      0,
                    );
                    return (
                      <td
                        key={month}
                        className="py-2 pl-4 text-right tabular-nums"
                      >
                        {formatEuro(sum)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Saldo&apos;s bijwerken</DialogTitle>
            <DialogDescription>
              Vul per rekening het saldo in voor een maand.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ab-month">Maand</Label>
              <Input
                id="ab-month"
                type="month"
                value={month.slice(0, 7)}
                onChange={(event) => {
                  setMonth(event.target.value);
                  prefill(event.target.value);
                }}
              />
            </div>
            {accounts.map((account) => (
              <div
                key={account}
                className="grid grid-cols-[1fr_8rem] items-center gap-2"
              >
                <Label className="truncate font-normal">{account}</Label>
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amounts[account] ?? ""}
                  onChange={(event) =>
                    setAmounts((current) => ({
                      ...current,
                      [account]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <div className="space-y-2 border-t pt-3">
              {ACCOUNT_SUGGESTIONS.filter((name) => !accounts.includes(name))
                .length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ACCOUNT_SUGGESTIONS.filter(
                    (name) => !accounts.includes(name),
                  ).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setNewAccount(name)}
                      className="rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-[1fr_8rem] items-center gap-2">
                <Input
                  placeholder="Nieuwe rekening"
                  value={newAccount}
                  onChange={(event) => setNewAccount(event.target.value)}
                />
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={newAmount}
                  onChange={(event) => setNewAmount(event.target.value)}
                />
              </div>
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
            <Button onClick={save} disabled={pending}>
              {pending ? "Opslaan…" : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
