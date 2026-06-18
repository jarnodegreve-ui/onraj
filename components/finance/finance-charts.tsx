"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CategorySlice, TrendPoint } from "@/lib/finance";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const trendConfig = {
  inkomst: { label: "Inkomsten", color: "var(--chart-2)" },
  uitgave: { label: "Uitgaven", color: "var(--chart-5)" },
} satisfies ChartConfig;

const compactEuro = (value: number) =>
  `€${new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 0 }).format(value)}`;

export function FinanceCharts({
  categories,
  trend,
}: {
  categories: CategorySlice[];
  trend: TrendPoint[];
}) {
  const categoryConfig = Object.fromEntries(
    categories.map((slice, index) => [
      slice.category,
      { label: slice.category, color: CHART_COLORS[index % CHART_COLORS.length] },
    ]),
  ) satisfies ChartConfig;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uitgaven per categorie</CardTitle>
          <CardDescription>Deze maand</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <EmptyChart>Geen uitgaven deze maand.</EmptyChart>
          ) : (
            <ChartContainer
              config={categoryConfig}
              className="mx-auto aspect-square max-h-[16rem]"
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="category" hideLabel />}
                />
                <Pie
                  data={categories}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={50}
                >
                  {categories.map((slice, index) => (
                    <Cell
                      key={slice.category}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inkomsten vs uitgaven</CardTitle>
          <CardDescription>Laatste 6 maanden</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="max-h-[16rem] w-full">
            <BarChart data={trend} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="capitalize"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={compactEuro}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="inkomst" fill="var(--color-inkomst)" radius={4} />
              <Bar dataKey="uitgave" fill="var(--color-uitgave)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[16rem] items-center justify-center text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
