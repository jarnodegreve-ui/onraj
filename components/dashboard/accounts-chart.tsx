"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { formatEuro } from "@/lib/format";

const COLORS = ["#2563eb", "#7c3aed", "#22d3ee", "#22c55e", "#f59e0b", "#f43f5e"];

type Datum = { account: string; amount: number };

// Compact bedrag (zonder centen) voor het label boven de balk.
function shortEuro(value: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Datum; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-foreground">
        {item.payload.account}
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {formatEuro(Number(item.value))}
      </p>
    </div>
  );
}

export function AccountsChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 8 }}>
        <XAxis
          dataKey="account"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.35 }}
          content={<ChartTooltip />}
        />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={72}>
          <LabelList
            dataKey="amount"
            position="top"
            fill="var(--foreground)"
            fontSize={11}
            formatter={(value) => shortEuro(Number(value))}
          />
          {data.map((entry, index) => (
            <Cell key={entry.account} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
