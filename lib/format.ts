import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

/** Datum in NL-notatie, standaard "12 jun 2026". */
export function formatDate(value: string | Date, pattern = "d MMM yyyy") {
  return format(new Date(value), pattern, { locale: nl });
}

/** Datum + tijd, "12 jun 2026, 14:30". */
export function formatDateTime(value: string | Date) {
  return format(new Date(value), "d MMM yyyy, HH:mm", { locale: nl });
}

/** Relatieve tijd, "3 dagen geleden". */
export function fromNow(value: string | Date) {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: nl });
}

/** Bedrag in euro, Belgische notatie ("€ 1.234,56"). */
export function formatEuro(amount: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/** Begroeting op basis van het uur van de dag (0–23). */
export function greetingFor(hour: number) {
  if (hour < 6) return "Goedenacht";
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

/**
 * Begroeting voor een tijdzone (standaard Brussel). Server-side berekend, zodat
 * ze klopt ongeacht de tijdzone van de Vercel-server en er geen hydration-
 * mismatch ontstaat.
 */
export function greetingForTimeZone(timeZone = "Europe/Brussels") {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).format(new Date()),
  );
  return greetingFor(hour % 24);
}

/** Leidt een weergavenaam af uit een e-mailadres ("jarno.degreve@…" → "Jarno"). */
export function displayName(email: string | null | undefined) {
  if (!email) return "Jarno";
  const local = email.split("@")[0]?.split(/[.+_-]/)[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Jarno";
}
