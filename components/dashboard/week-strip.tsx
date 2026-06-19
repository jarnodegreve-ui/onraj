import {
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { nl } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dayKey, groupEventsByDay } from "@/lib/agenda";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WeekStrip({
  events,
  todayKey,
}: {
  events: CalendarEvent[];
  todayKey: string;
}) {
  const today = parseISO(todayKey);
  const days = eachDayOfInterval({
    start: startOfWeek(today, { weekStartsOn: 1 }),
    end: endOfWeek(today, { weekStartsOn: 1 }),
  });
  const byDay = groupEventsByDay(events);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Deze week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const key = dayKey(day);
            const isToday = key === todayKey;
            const count = byDay.get(key)?.length ?? 0;
            return (
              <div key={key} className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-muted-foreground uppercase">
                  {format(day, "EEEEEE", { locale: nl })}
                </span>
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-sm font-medium tabular-nums sm:size-9",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : count > 0
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {format(day, "d")}
                </div>
                <span
                  className={cn(
                    "size-1 rounded-full",
                    count > 0 && !isToday ? "bg-primary" : "bg-transparent",
                  )}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
