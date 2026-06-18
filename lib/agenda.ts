import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { CalendarEvent } from "./types";

/** Vaste kleurkeuzes voor afspraken (hex-waarden in de DB). */
export const EVENT_COLORS = [
  { name: "Blauw", value: "#2563eb" },
  { name: "Groen", value: "#16a34a" },
  { name: "Amber", value: "#d97706" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Rood", value: "#e11d48" },
  { name: "Grijs", value: "#475569" },
] as const;

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0].value;

/** Dagsleutel "yyyy-MM-dd" in lokale tijd. */
export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Vandaag als dagsleutel in een tijdzone (standaard Brussel), server-veilig. */
export function currentDayKey(timeZone = "Europe/Brussels"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Dag waarop een afspraak begint (lokale tijd). */
export function eventDayKey(event: CalendarEvent): string {
  return format(parseISO(event.startsAt), "yyyy-MM-dd");
}

/**
 * 6 weken (42 dagen) die de maand omsluiten, maandag als eerste dag —
 * voor een vaste maandkalender-grid.
 */
export function monthGridDays(monthKey: string): Date[] {
  const first = startOfMonth(parseISO(`${monthKey}-01`));
  const gridStart = startOfWeek(first, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(first), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

/** Groepeert afspraken per dag (gesorteerd op begintijd). */
export function groupEventsByDay(
  events: CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = eventDayKey(event);
    const list = byDay.get(key);
    if (list) list.push(event);
    else byDay.set(key, [event]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return byDay;
}

/** Komende (en nog lopende) afspraken vanaf een tijdstip, oplopend. */
export function upcomingEvents(
  events: CalendarEvent[],
  from: Date,
  count = 5,
): CalendarEvent[] {
  const fromMs = from.getTime();
  return events
    .filter(
      (event) => new Date(event.endsAt ?? event.startsAt).getTime() >= fromMs,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, count);
}
