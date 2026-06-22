import type { StatItem } from "@/lib/stats";

/**
 * Horizontale verdeling als proportionele staafjes (categorie, prioriteit, …).
 * Werkt voor aantallen én bedragen via `formatValue`.
 */
export function Breakdown({
  items,
  formatValue = (value) => String(value),
  emptyLabel = "Geen gegevens",
}: {
  items: StatItem[];
  formatValue?: (value: number) => string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-foreground/90">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatValue(item.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max((item.value / max) * 100, 4)}%`,
                backgroundColor: item.color ?? "var(--primary)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
