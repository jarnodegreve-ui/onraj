import Link from "next/link";

import { formatTime } from "@/lib/format";
import type { CalendarEvent } from "@/lib/types";

// "over 2 uur", "over 30 min", "morgen" … relatief tot nu.
function relativeLabel(startsAt: string, allDay: boolean): string {
  if (allDay) return "hele dag";
  const min = Math.round(
    (new Date(startsAt).getTime() - Date.now()) / 60000,
  );
  if (min <= 0) return "nu bezig";
  if (min < 60) return `over ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) {
    const rest = min % 60;
    return rest ? `over ${hours} u ${rest} min` : `over ${hours} uur`;
  }
  const days = Math.round(hours / 24);
  return days === 1 ? "morgen" : `over ${days} dagen`;
}

/** "HIERNA" — de eerstvolgende afspraak als denim-hero op het dashboard. */
export function NextUp({ event }: { event: CalendarEvent | null }) {
  if (!event) return null;
  const when = event.allDay ? "Hele dag" : formatTime(event.startsAt);
  return (
    <Link href="/agenda" className="group block">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground transition-transform group-active:scale-[0.99]">
        <p className="font-mono text-[11px] font-semibold tracking-[0.2em] opacity-80">
          HIERNA
        </p>
        <p className="mt-2 text-xl leading-snug font-semibold">
          {when} · {event.title}
        </p>
        <p className="mt-1.5 text-sm opacity-85">
          {relativeLabel(event.startsAt, event.allDay)}
          {event.location ? ` · ${event.location}` : ""}
        </p>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -bottom-8 size-32 rounded-full bg-white/10"
        />
      </div>
    </Link>
  );
}
