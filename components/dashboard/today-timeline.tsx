import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/format";
import { priorityMeta } from "@/lib/tasks";
import type { CalendarEvent, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Eén blik op vandaag: afspraken (op tijd) als tijdlijn + de taken die vandaag
 * (of te laat) op de planning staan. Bovenaan het dashboard.
 */
export function TodayTimeline({
  events,
  tasks,
  todayKey,
  className,
}: {
  events: CalendarEvent[];
  tasks: Task[];
  todayKey: string;
  className?: string;
}) {
  const leeg = events.length === 0 && tasks.length === 0;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-primary" />
          Vandaag
        </CardTitle>
        <CardDescription className="first-letter:uppercase">
          {formatDate(todayKey, "EEEE d MMMM")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
        {leeg ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
            <CalendarClock className="size-9 text-muted-foreground/30" />
            <p className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground">
              <span className="text-primary" aria-hidden>
                ❯
              </span>
              niets op de planning
              <span
                aria-hidden
                className="cursor-blink inline-block h-[1.05em] w-[0.5ch] bg-primary"
              />
            </p>
          </div>
        ) : (
          <>
            {events.length > 0 && (
              <ol className="relative ml-1 space-y-3 border-l border-border pl-4">
                {events.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      className="absolute top-1 -left-[1.32rem] size-2.5 rounded-full ring-2 ring-card"
                      style={{ backgroundColor: event.color ?? "#c2f04d" }}
                    />
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                        {event.allDay ? "Hele dag" : formatTime(event.startsAt)}
                      </span>
                      <span className="text-sm font-medium">{event.title}</span>
                    </div>
                    {event.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {tasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Te doen
                </p>
                <ul className="space-y-1.5">
                  {tasks.map((task) => {
                    const overdue = !!task.dueOn && task.dueOn < todayKey;
                    return (
                      <li
                        key={task.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: priorityMeta(task.priority).color,
                          }}
                        />
                        <span className="truncate">{task.title}</span>
                        {overdue && (
                          <span className="shrink-0 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                            te laat
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <Link
              href="/agenda"
              className="inline-block text-xs font-medium text-primary hover:underline"
            >
              Naar agenda →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
