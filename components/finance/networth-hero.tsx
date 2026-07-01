import { CountUp } from "@/components/count-up";
import { NetWorthChart } from "@/components/dashboard/networth-chart";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Point = { month: string; total: number };

/** Vermogen als hero bovenaan Financiën: groot mono-cijfer, maanddelta-badge
 *  in pos/neg en de 12-maandslijn. `action` (het slot-knopje) rechtsboven. */
export function NetWorthHero({
  series,
  action,
}: {
  series: Point[];
  action?: React.ReactNode;
}) {
  const latest = series.at(-1);
  const previous = series.at(-2);
  const delta =
    latest && previous && previous.total !== 0
      ? ((latest.total - previous.total) / Math.abs(previous.total)) * 100
      : null;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading text-[13px] font-medium text-muted-foreground">
            Vermogen
          </p>
          {action}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
            {latest ? <CountUp value={latest.total} format="euro" /> : "—"}
          </p>
          {delta !== null && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums",
                delta >= 0 ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg",
              )}
            >
              {delta >= 0 ? "+" : ""}
              {delta.toLocaleString("nl-BE", { maximumFractionDigits: 1 })}%
              t.o.v. vorige maand
            </span>
          )}
        </div>
        {series.length > 1 && <NetWorthChart data={series} height={140} />}
      </CardContent>
    </Card>
  );
}
