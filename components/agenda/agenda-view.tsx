"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
import { CalendarDays, Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { EventEditor } from "@/components/agenda/event-editor";
import { MonthCalendar } from "@/components/agenda/month-calendar";
import { UpcomingEvents } from "@/components/agenda/upcoming-events";
import { EmptyState } from "@/components/empty-state";
import { MonthSelector } from "@/components/month-selector";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { disconnectGoogle } from "@/lib/actions/google";
import { groupEventsByDay } from "@/lib/agenda";
import { currentMonthKey } from "@/lib/month";
import type { CalendarEvent } from "@/lib/types";

export function AgendaView({
  events,
  upcoming,
  initialMonth,
  todayKey,
  googleConnected,
  preview,
}: {
  events: CalendarEvent[];
  upcoming: CalendarEvent[];
  initialMonth: string;
  todayKey: string;
  googleConnected: boolean;
  preview: boolean;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const today = useMemo(() => parseISO(todayKey), [todayKey]);

  function openNew(dayIso?: string) {
    setSelectedDate(dayIso ?? todayKey);
    setEditing(null);
    setEditorOpen(true);
  }

  function openEvent(event: CalendarEvent) {
    // Google-afspraken zijn alleen-lezen → open ze in Google Agenda.
    if (event.source === "google") {
      if (event.htmlLink) window.open(event.htmlLink, "_blank", "noopener");
      return;
    }
    setEditing(event);
    setEditorOpen(true);
  }

  if (preview) {
    return (
      <div>
        <PageHeader
          title="Agenda"
          description="Je afspraken en komende activiteiten."
        >
          <Button disabled>
            <Plus className="size-4" /> Nieuwe afspraak
          </Button>
        </PageHeader>
        <EmptyState
          icon={CalendarDays}
          title="Preview-modus"
          description="Koppel Supabase om afspraken te plannen."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Je afspraken en komende activiteiten."
      >
        <GoogleControl connected={googleConnected} />
        <MonthSelector month={month} onChange={setMonth} />
        <Button variant="outline" onClick={() => setMonth(currentMonthKey())}>
          Vandaag
        </Button>
        <Button onClick={() => openNew()}>
          <Plus className="size-4" /> Nieuwe afspraak
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthCalendar
            month={month}
            eventsByDay={eventsByDay}
            today={today}
            onSelectDay={openNew}
            onSelectEvent={openEvent}
          />
        </div>
        <UpcomingEvents events={upcoming} onSelect={openEvent} />
      </div>

      <EventEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        event={editing}
        defaultDate={selectedDate}
      />
    </div>
  );
}

function GoogleControl({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!connected) {
    return (
      <Button
        variant="outline"
        onClick={() => {
          window.location.href = "/api/google/connect";
        }}
      >
        <CalendarDays className="size-4" /> Koppel Google
      </Button>
    );
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectGoogle();
      if (result.ok) {
        toast.success("Google Agenda losgekoppeld");
        router.refresh();
      } else {
        toast.error("Ontkoppelen mislukt", { description: result.error });
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" disabled={pending}>
            <Check className="size-4 text-emerald-600" /> Google
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onClick={disconnect}>
          Ontkoppelen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
