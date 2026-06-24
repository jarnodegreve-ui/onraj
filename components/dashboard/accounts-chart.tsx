"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatEuro } from "@/lib/format";

const COLORS = ["#3d5afe", "#7c3aed", "#22d3ee", "#22c55e", "#f59e0b", "#f43f5e"];

type Datum = { account: string; amount: number };

// Compact bedrag (zonder centen) voor het label naast de balk.
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
  const height = Math.max(130, data.length * 34);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 64, bottom: 4, left: 4 }}
        barCategoryGap="30%"
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="account"
          width={100}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.35 }}
          content={<ChartTooltip />}
        />
        <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={18}>
          <LabelList
            dataKey="amount"
            position="right"
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
