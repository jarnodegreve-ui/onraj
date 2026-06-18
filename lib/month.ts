import { addMonths, format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

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
