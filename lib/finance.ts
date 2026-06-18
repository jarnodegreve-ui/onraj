import { addMonths, format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

import type { Transaction } from "./types";

/** Maandsleutel "YYYY-MM" van een Date. */
export function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

/** Maandsleutel van een ISO-datum ("2026-06-18" → "2026-06"). */
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Leesbaar maandlabel, standaard "juni 2026". */
export function monthLabel(key: string, pattern = "MMMM yyyy"): string {
  return format(parseISO(`${key}-01`), pattern, { locale: nl });
}

/** Verschuift een maandsleutel met een aantal maanden. */
export function shiftMonth(key: string, delta: number): string {
  return monthKey(addMonths(parseISO(`${key}-01`), delta));
}

/** Huidige maandsleutel in een tijdzone (standaard Brussel), server-veilig. */
export function currentMonthKey(timeZone = "Europe/Brussels"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

export interface MonthSummary {
  inkomsten: number;
  uitgaven: number;
  saldo: number;
}

/** Telt inkomsten/uitgaven/saldo voor één maand. */
export function summariseMonth(
  transactions: Transaction[],
  key: string,
): MonthSummary {
  let inkomsten = 0;
  let uitgaven = 0;
  for (const tx of transactions) {
    if (monthKeyOf(tx.occurredOn) !== key) continue;
    if (tx.direction === "inkomst") inkomsten += tx.amount;
    else uitgaven += tx.amount;
  }
  return { inkomsten, uitgaven, saldo: inkomsten - uitgaven };
}

export interface CategorySlice {
  category: string;
  amount: number;
}

/** Uitgaven gegroepeerd per categorie voor één maand, hoogste eerst. */
export function expensesByCategory(
  transactions: Transaction[],
  key: string,
): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.direction !== "uitgave" || monthKeyOf(tx.occurredOn) !== key) continue;
    const category = tx.category.trim() || "Overig";
    totals.set(category, (totals.get(category) ?? 0) + tx.amount);
  }
  return Array.from(totals, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount,
  );
}

export interface TrendPoint {
  key: string;
  label: string;
  inkomst: number;
  uitgave: number;
}

/** Inkomsten/uitgaven per maand voor de laatste `count` maanden t/m `endKey`. */
export function monthlyTrend(
  transactions: Transaction[],
  endKey: string,
  count = 6,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const key = shiftMonth(endKey, -i);
    const summary = summariseMonth(transactions, key);
    points.push({
      key,
      label: monthLabel(key, "MMM"),
      inkomst: summary.inkomsten,
      uitgave: summary.uitgaven,
    });
  }
  return points;
}
