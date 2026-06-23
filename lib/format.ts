import { format, formatDistanceToNow, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

/** Datum in NL-notatie, standaard "12 jun 2026". */
export function formatDate(value: string | Date, pattern = "d MMM yyyy") {
  return format(new Date(value), pattern, { locale: nl });
}

/** Relatieve tijd, "3 dagen geleden". */
export function fromNow(value: string | Date) {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: nl });
}

/** Tijdstip "14:30" (lokale tijd). */
export function formatTime(value: string | Date) {
  return format(typeof value === "string" ? parseISO(value) : value, "HH:mm", {
    locale: nl,
  });
}

/** Bedrag in euro, Belgische notatie ("€ 1.234,56"). */
export function formatEuro(amount: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/** Leidt een weergavenaam af uit een e-mailadres ("jarno.degreve@…" → "Jarno"). */
export function displayName(email: string | null | undefined) {
  if (!email) return "Jarno";
  const local = email.split("@")[0]?.split(/[.+_-]/)[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Jarno";
}
