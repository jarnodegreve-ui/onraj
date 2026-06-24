"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatEuro } from "@/lib/format";

type Point = { month: string; total: number };

function fmtMonth(monthKey: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    month: "short",
    year: "2-digit",
  }).format(new Date(`${monthKey}-01T00:00:00`));
}

function shortEuro(value: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function NetWorthTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-foreground">
        {fmtMonth(item.payload.month)}
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {formatEuro(Number(item.value))}
      </p>
    </div>
  );
}

export function NetWorthChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="networth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d5afe" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3d5afe" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tickFormatter={fmtMonth}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          width={56}
          tickFormatter={(value) => shortEuro(Number(value))}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={<NetWorthTooltip />}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#3d5afe"
          strokeWidth={2}
          fill="url(#networth)"
          dot={{ r: 3, fill: "#3d5afe" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
