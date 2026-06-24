import { monthKeyOf, monthLabel, shiftMonth } from "./month";
import type {
  RecurringTransaction,
  TransactieRichting,
  Transaction,
} from "./types";

// Generieke maand-helpers wonen in ./month; hier her-geëxporteerd voor gemak.
export {
  currentMonthKey,
  monthKey,
  monthKeyOf,
  monthLabel,
  shiftMonth,
} from "./month";

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

export interface CashflowItem {
  description: string;
  category: string;
  amount: number;
  direction: TransactieRichting;
  dayOfMonth: number;
  upcoming: boolean; // dag valt vandaag of later deze maand
}

export interface CashflowOutlook {
  inkomstenTotaal: number;
  uitgavenTotaal: number;
  nettoMaand: number;
  komendeInkomsten: number;
  komendeUitgaven: number;
  komendNetto: number;
  items: CashflowItem[];
}

/**
 * Projecteert de vaste posten (terugkerende sjablonen) voor één maand: het
 * maandtotaal én wat er deze maand nog moet komen (dag op of na `todayDay`).
 * Houdt rekening met start- en einddatum van elke post.
 */
export function projectCashflow(
  templates: RecurringTransaction[],
  monthKey: string,
  todayDay: number,
): CashflowOutlook {
  const items: CashflowItem[] = [];
  let inkomstenTotaal = 0;
  let uitgavenTotaal = 0;
  let komendeInkomsten = 0;
  let komendeUitgaven = 0;

  for (const t of templates) {
    if (!t.active) continue;
    if (t.startMonth > monthKey) continue;
    if (t.endMonth && t.endMonth < monthKey) continue;

    const upcoming = t.dayOfMonth >= todayDay;
    items.push({
      description:
        t.description ||
        t.category ||
        (t.direction === "inkomst" ? "Inkomst" : "Uitgave"),
      category: t.category,
      amount: t.amount,
      direction: t.direction,
      dayOfMonth: t.dayOfMonth,
      upcoming,
    });

    if (t.direction === "inkomst") {
      inkomstenTotaal += t.amount;
      if (upcoming) komendeInkomsten += t.amount;
    } else {
      uitgavenTotaal += t.amount;
      if (upcoming) komendeUitgaven += t.amount;
    }
  }

  items.sort((a, b) => a.dayOfMonth - b.dayOfMonth);

  return {
    inkomstenTotaal,
    uitgavenTotaal,
    nettoMaand: inkomstenTotaal - uitgavenTotaal,
    komendeInkomsten,
    komendeUitgaven,
    komendNetto: komendeInkomsten - komendeUitgaven,
    items,
  };
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
