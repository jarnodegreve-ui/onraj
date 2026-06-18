import Link from "next/link";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowRight } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_EVENT_COLOR } from "@/lib/agenda";
import { formatTime } from "@/lib/format";
import type { CalendarEvent } from "@/lib/types";

export function DashboardUpcoming({ events }: { events: CalendarEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Komende afspraken</CardTitle>
        <CardAction>
          <Link
            href="/agenda"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Agenda <ArrowRight className="size-3.5" />
          </Link>
        </CardAction>
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
                <Link
                  href="/agenda"
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: event.color ?? DEFAULT_EVENT_COLOR,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(event.startsAt), "EEE d MMM", {
                        locale: nl,
                      })}
                      {event.allDay
                        ? " · Hele dag"
                        : ` · ${formatTime(event.startsAt)}`}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
