"use client";

import { format, isSameDay, isSameMonth, parseISO } from "date-fns";

import { dayKey, DEFAULT_EVENT_COLOR, monthGridDays } from "@/lib/agenda";
import { formatTime } from "@/lib/format";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MAX_CHIPS = 3;

export function MonthCalendar({
  month,
  eventsByDay,
  today,
  onSelectDay,
  onSelectEvent,
}: {
  month: string;
  eventsByDay: Map<string, CalendarEvent[]>;
  today: Date;
  onSelectDay: (dayIso: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const days = monthGridDays(month);
  const monthStart = parseISO(`${month}-01`);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 capitalize">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              onClick={() => onSelectDay(key)}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col gap-1 border-r border-b p-1.5 transition-colors hover:bg-accent/40 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/20 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "ml-auto flex size-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, MAX_CHIPS).map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    onSelect={onSelectEvent}
                  />
                ))}
                {dayEvents.length > MAX_CHIPS && (
                  <span className="px-1 text-[11px] text-muted-foreground">
                    +{dayEvents.length - MAX_CHIPS} meer
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventChip({
  event,
  onSelect,
}: {
  event: CalendarEvent;
  onSelect: (event: CalendarEvent) => void;
}) {
  const color = event.color ?? DEFAULT_EVENT_COLOR;

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onSelect(event);
      }}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          onSelect(event);
        }
      }}
      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] hover:bg-accent"
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {!event.allDay && (
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatTime(event.startsAt)}
        </span>
      )}
      <span className="truncate">{event.title}</span>
    </span>
  );
}
