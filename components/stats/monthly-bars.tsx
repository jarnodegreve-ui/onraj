"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import type { MonthCount } from "@/lib/stats";

function ChartTooltip({
  active,
  payload,
  noun,
}: {
  active?: boolean;
  payload?: { payload: MonthCount }[];
  noun: [string, string];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-foreground first-letter:uppercase">
        {point.label}
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {point.count} {point.count === 1 ? noun[0] : noun[1]}
      </p>
    </div>
  );
}

/** Compacte maand-staafdiagram voor tellingen (notities/afspraken per maand). */
export function MonthlyBars({
  data,
  color = "#3d5afe",
  noun = ["item", "items"],
}: {
  data: MonthCount[];
  color?: string;
  noun?: [string, string];
}) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          className="capitalize"
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<ChartTooltip noun={noun} />}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={color} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
