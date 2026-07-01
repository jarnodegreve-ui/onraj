import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import type { CashflowOutlook as Outlook } from "@/lib/finance";
import { monthLabel } from "@/lib/month";
import { cn } from "@/lib/utils";

// Vooruitblik op de vaste posten: wat komt er deze maand nog, en wat is de
// vaste maandbalans? Puur weergave — de berekening zit in lib/finance.ts.
export function CashflowOutlook({
  outlook,
  monthKey,
}: {
  outlook: Outlook;
  monthKey: string;
}) {
  const leeg = outlook.items.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4 text-primary" /> Cashflow-vooruitblik
        </CardTitle>
        <CardDescription className="first-letter:uppercase">
          {monthLabel(monthKey)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {leeg ? (
          <p className="py-2 text-sm text-muted-foreground">
            Nog geen vaste posten. Voeg ze hieronder toe bij “Vaste posten” —
            dan zie je hier wat er elke maand op je rekening komt en afgaat.
          </p>
        ) : (
          <>
            {/* Nog te komen deze maand */}
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Nog te komen deze maand
              </p>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown className="size-4 text-rose-500" /> Uitgaven
                </span>
                <span className="font-semibold tabular-nums">
                  {formatEuro(outlook.komendeUitgaven)}
                </span>
              </div>
              {outlook.komendeInkomsten > 0 && (
                <div className="mt-1.5 flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="size-4 text-emerald-500" /> Inkomsten
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatEuro(outlook.komendeInkomsten)}
                  </span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-4 border-t pt-2 text-sm">
                <span className="font-medium">Netto nog te komen</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    outlook.komendNetto >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {formatEuro(outlook.komendNetto)}
                </span>
              </div>
            </div>

            {/* Vaste posten per maand */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat
                label="Vaste inkomsten"
                value={formatEuro(outlook.inkomstenTotaal)}
                className="text-emerald-600 dark:text-emerald-400"
              />
              <Stat
                label="Vaste lasten"
                value={formatEuro(outlook.uitgavenTotaal)}
                className="text-rose-600 dark:text-rose-400"
              />
              <Stat
                label="Netto/maand"
                value={formatEuro(outlook.nettoMaand)}
                className={
                  outlook.nettoMaand >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }
              />
            </div>

            {/* Lijst */}
            <ul className="divide-y text-sm">
              {outlook.items.map((item, i) => (
                <li
                  key={`${item.description}-${item.dayOfMonth}-${i}`}
                  className={cn(
                    "flex items-center gap-3 py-2",
                    !item.upcoming && "opacity-50",
                  )}
                >
                  <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
                    dag {item.dayOfMonth}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {item.description}
                    {!item.upcoming && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (geweest)
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-medium tabular-nums",
                      item.direction === "inkomst"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground",
                    )}
                  >
                    {item.direction === "inkomst" ? "+" : "−"}{" "}
                    {formatEuro(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border p-2">
      <p className={cn("text-sm font-semibold tabular-nums", className)}>
        {value}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
