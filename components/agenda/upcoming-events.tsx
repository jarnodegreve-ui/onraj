"use client";

import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_EVENT_COLOR } from "@/lib/agenda";
import { formatTime } from "@/lib/format";
import type { CalendarEvent } from "@/lib/types";

export function UpcomingEvents({
  events,
  onSelect,
}: {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Komende afspraken</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Geen komende afspraken.
          </p>
        ) : (
          <ul className="space-y-1">
            {events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className="flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                >
                  <DateBadge iso={event.startsAt} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: event.color ?? DEFAULT_EVENT_COLOR,
                        }}
                      />
                      <p className="truncate text-sm font-medium">
                        {event.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(event.startsAt), "EEEE d MMM", {
                        locale: nl,
                      })}
                      {event.allDay
                        ? " · Hele dag"
                        : ` · ${formatTime(event.startsAt)}`}
                      {event.source === "google" && " · Google"}
                    </p>
                    {event.location && (
                      <p className="truncate text-xs text-muted-foreground">
                        {event.location}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DateBadge({ iso }: { iso: string }) {
  const date = parseISO(iso);
  return (
    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border bg-muted/40">
      <span className="text-[10px] uppercase text-muted-foreground">
        {format(date, "MMM", { locale: nl })}
      </span>
      <span className="text-sm leading-none font-semibold">
        {format(date, "d")}
      </span>
    </div>
  );
}
