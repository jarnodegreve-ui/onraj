"use client";

import { useState, useTransition } from "react";
import {
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { HoldingEditor } from "@/components/finance/holding-editor";
import { InvestmentsChart } from "@/components/finance/investments-chart";
import { PriceUpdateDialog } from "@/components/finance/price-update-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteHolding } from "@/lib/actions/investments";
import { formatDate, formatEuro } from "@/lib/format";
import {
  holdingValues,
  portfolioHistory,
  portfolioTotals,
} from "@/lib/investments";
import type { Holding, HoldingPrice } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatQty(value: number) {
  return new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 6 }).format(
    value,
  );
}

export function InvestmentsCard({
  holdings,
  prices,
}: {
  holdings: Holding[];
  prices: HoldingPrice[];
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);

  const values = holdingValues(holdings, prices);
  const totals = portfolioTotals(values);
  const history = portfolioHistory(holdings, prices);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(holding: Holding) {
    setEditing(holding);
    setEditorOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Beleggingen</CardTitle>
        <CardAction className="flex gap-2">
          {holdings.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPriceOpen(true)}
            >
              <RefreshCw className="size-4" /> Koersen
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus className="size-4" /> Belegging
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {holdings.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nog geen beleggingen — voeg een aandeel of ETF toe en werk wekelijks
            de koers bij om je waarde en rendement te volgen.
          </p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Totale waarde</p>
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {formatEuro(totals.value)}
                </p>
              </div>
              {totals.gainPct != null && (
                <GainBadge gain={totals.gain} pct={totals.gainPct} />
              )}
            </div>

            {history.length >= 2 && <InvestmentsChart data={history} />}

            <ul className="divide-y">
              {values.map((item) => (
                <li
                  key={item.holding.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.holding.name}
                      {item.holding.ticker && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {item.holding.ticker}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs tabular-nums text-muted-foreground">
                      {formatQty(item.holding.quantity)} ×{" "}
                      {item.latestPrice != null
                        ? formatEuro(item.latestPrice)
                        : "geen koers"}
                      {item.latestDate && ` · ${formatDate(item.latestDate)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-medium tabular-nums">
                      {formatEuro(item.value)}
                    </p>
                    {item.gain != null && item.gainPct != null && (
                      <p
                        className={cn(
                          "text-xs tabular-nums",
                          item.gain >= 0
                            ? "text-pos"
                            : "text-neg",
                        )}
                      >
                        {item.gain >= 0 ? "+" : ""}
                        {formatEuro(item.gain)} ({item.gainPct >= 0 ? "+" : ""}
                        {item.gainPct.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                  <HoldingMenu holding={item.holding} onEdit={openEdit} />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>

      <HoldingEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        holding={editing}
      />
      <PriceUpdateDialog
        open={priceOpen}
        onOpenChange={setPriceOpen}
        holdings={holdings}
        prices={prices}
      />
    </Card>
  );
}

function GainBadge({ gain, pct }: { gain: number; pct: number }) {
  const up = gain >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium tabular-nums",
        up
          ? "bg-pos/10 text-pos"
          : "bg-neg/10 text-neg",
      )}
    >
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {formatEuro(gain)} ({up ? "+" : ""}
      {pct.toFixed(1)}%)
    </div>
  );
}

function HoldingMenu({
  holding,
  onEdit,
}: {
  holding: Holding;
  onEdit: (holding: Holding) => void;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Deze belegging verwijderen?")) return;
    startTransition(async () => {
      const result = await deleteHolding(holding.id);
      if (result.ok) toast.success("Belegging verwijderd");
      else toast.error("Verwijderen mislukt", { description: result.error });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            aria-label="Acties"
            disabled={pending}
          >
            <MoreVertical className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(holding)}>
          <Pencil />
          Bewerken
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={remove}>
          <Trash2 />
          Verwijderen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
