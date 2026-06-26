"use client";

// Horizontale balkgrafiek van de rekeningstanden. Bewust geen recharts: bij een
// groot verschil (bv. één spaarrekening die de rest plat drukt) werden kleine
// rekeningen onzichtbaar. Hier krijgt elke rekening met saldo een leesbare balk
// (minimumbreedte) en de grootste balk is afgetopt zodat het bedrag ernaast past.
const COLORS = ["#3d68be", "#c98a3d", "#4f9e8f", "#c0566b", "#7a6cae", "#be5b3c"];

const MAX_BAR = 80; // % — grootste balk; laat ruimte voor het bedrag.
const MIN_BAR = 4; // % — kleinste zichtbare balk voor een saldo > 0.

type Datum = { account: string; amount: number };

function shortEuro(value: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AccountsChart({ data }: { data: Datum[] }) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  // Op absolute waarde schalen zodat ook een negatief saldo (schuld) een balk
  // krijgt; negatieve saldo's kleuren rood ter onderscheid.
  const maxAbs = Math.max(...sorted.map((d) => Math.abs(d.amount)), 0);

  return (
    <div className="space-y-2.5">
      {sorted.map((entry, index) => {
        const ratio = maxAbs > 0 ? Math.abs(entry.amount) / maxAbs : 0;
        const width =
          entry.amount !== 0 ? Math.max(ratio * MAX_BAR, MIN_BAR) : 0;
        const color =
          entry.amount < 0 ? "#c0566b" : COLORS[index % COLORS.length];
        return (
          <div key={entry.account} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-right text-xs text-muted-foreground">
              {entry.account}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {width > 0 ? (
                <div
                  className="h-5 shrink-0 rounded-md transition-[width] duration-500"
                  style={{ width: `${width}%`, backgroundColor: color }}
                />
              ) : (
                <div className="h-5 w-0.5 shrink-0 rounded-full bg-muted-foreground/30" />
              )}
              <span className="shrink-0 text-xs font-medium tabular-nums">
                {shortEuro(entry.amount)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
