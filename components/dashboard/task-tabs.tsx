"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { setTaskDone } from "@/lib/actions/tasks";
import { haptic } from "@/lib/haptics";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type Group = { name: string; tasks: Task[] };

/** Veegbare tab-kaart: per taak-categorie de openstaande taken; tik om af te
 *  vinken. Veeg tussen categorieën (of tik een tab). */
export function TaskTabs({ groups }: { groups: Group[] }) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }

  function goTo(i: number) {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActive(i);
  }

  if (groups.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group, i) => (
          <button
            key={group.name}
            type="button"
            onClick={() => goTo(i)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              i === active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {group.name}
            <span className="ml-1.5 tabular-nums opacity-70">
              {group.tasks.length}
            </span>
          </button>
        ))}
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group) => (
          <div
            key={group.name}
            className="w-full shrink-0 snap-start rounded-3xl border bg-card px-3 py-1"
          >
            {group.tasks.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Niets open hier — knap gedaan.
              </p>
            ) : (
              <ul className="divide-y">
                {group.tasks.slice(0, 6).map((task) => (
                  <TabRow key={task.id} task={task} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between px-1">
        <div className="flex gap-1.5">
          {groups.length > 1 &&
            groups.map((group, i) => (
              <span
                key={group.name}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === active ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30",
                )}
              />
            ))}
        </div>
        <Link
          href="/taken"
          className="text-xs font-medium text-primary hover:underline"
        >
          Alle taken →
        </Link>
      </div>
    </div>
  );
}

// Eén taakrij met afvink-knop; optimistisch wegnemen bij afvinken.
function TabRow({ task }: { task: Task }) {
  const [done, setDone] = useState(false);
  const [, startTransition] = useTransition();

  if (done) return null;

  function complete() {
    setDone(true);
    haptic("success");
    startTransition(async () => {
      const result = await setTaskDone(task.id, true);
      if (!result.ok) {
        setDone(false);
        toast.error("Mislukt", { description: result.error });
      } else {
        // Bevestiging mét undo: tik om de taak weer open te zetten.
        toast.success("Taak voltooid", {
          action: {
            label: "Ongedaan maken",
            onClick: () => {
              setDone(false);
              startTransition(async () => {
                const undo = await setTaskDone(task.id, false);
                if (!undo.ok)
                  toast.error("Terugzetten mislukt", {
                    description: undo.error,
                  });
              });
            },
          },
        });
      }
    });
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={complete}
        aria-label="Afvinken"
        className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.7px] border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <Check className="size-3.5 opacity-0" />
      </button>
      <span className="min-w-0 flex-1 truncate text-[15px]">{task.title}</span>
    </li>
  );
}
