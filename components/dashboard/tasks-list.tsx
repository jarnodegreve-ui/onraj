import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DashboardTasks({
  tasks,
  todayKey,
}: {
  tasks: Task[];
  todayKey: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Openstaande taken</CardTitle>
        <CardAction>
          <Link
            href="/taken"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Alle <ArrowRight className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Niets te doen — alles afgewerkt. 🎉
          </p>
        ) : (
          <ul className="space-y-1">
            {tasks.map((task) => {
              const overdue = !!task.dueOn && task.dueOn < todayKey;
              return (
                <li key={task.id}>
                  <Link
                    href="/taken"
                    className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent"
                  >
                    <span className="size-4 shrink-0 rounded-full border border-muted-foreground/40" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {task.title}
                    </span>
                    {task.dueOn && (
                      <span
                        className={cn(
                          "shrink-0 text-xs",
                          overdue
                            ? "text-neg"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatDate(task.dueOn, "d MMM")}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
