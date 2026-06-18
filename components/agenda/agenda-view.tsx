"use client";

import { useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { CalendarDays, Plus } from "lucide-react";

import { EventEditor } from "@/components/agenda/event-editor";
import { MonthCalendar } from "@/components/agenda/month-calendar";
import { UpcomingEvents } from "@/components/agenda/upcoming-events";
import { EmptyState } from "@/components/empty-state";
import { MonthSelector } from "@/components/month-selector";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { groupEventsByDay } from "@/lib/agenda";
import { currentMonthKey } from "@/lib/month";
import type { CalendarEvent } from "@/lib/types";

export function AgendaView({
  events,
  upcoming,
  initialMonth,
  todayKey,
  preview,
}: {
  events: CalendarEvent[];
  upcoming: CalendarEvent[];
  initialMonth: string;
  todayKey: string;
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

  function openEdit(event: CalendarEvent) {
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
            onSelectEvent={openEdit}
          />
        </div>
        <UpcomingEvents events={upcoming} onSelect={openEdit} />
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
