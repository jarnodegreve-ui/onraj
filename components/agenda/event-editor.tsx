"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEvent, deleteEvent, updateEvent } from "@/lib/actions/events";
import { createGoogleCalendarEvent } from "@/lib/actions/google";
import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from "@/lib/agenda";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EventEditor({
  open,
  onOpenChange,
  event,
  defaultDate,
  googleConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  defaultDate: string;
  googleConnected: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {event ? "Afspraak bewerken" : "Nieuwe afspraak"}
          </DialogTitle>
          <DialogDescription>Plan een afspraak in je agenda.</DialogDescription>
        </DialogHeader>
        <EventForm
          key={event?.id ?? `nieuw-${defaultDate}`}
          event={event}
          defaultDate={defaultDate}
          googleConnected={googleConnected}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  event,
  defaultDate,
  googleConnected,
  onClose,
}: {
  event: CalendarEvent | null;
  defaultDate: string;
  googleConnected: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(
    event ? format(parseISO(event.startsAt), "yyyy-MM-dd") : defaultDate,
  );
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startTime, setStartTime] = useState(
    event && !event.allDay ? format(parseISO(event.startsAt), "HH:mm") : "09:00",
  );
  const [endTime, setEndTime] = useState(
    event?.endsAt ? format(parseISO(event.endsAt), "HH:mm") : "",
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [color, setColor] = useState(event?.color ?? DEFAULT_EVENT_COLOR);
  const [destination, setDestination] = useState<"local" | "google">("local");
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const busy = saving || deleting;

  function save() {
    if (!title.trim()) {
      toast.error("Geef een titel.");
      return;
    }
    if (!date) {
      toast.error("Kies een datum.");
      return;
    }

    let startsAt: string;
    let endsAt: string | null;
    if (allDay) {
      startsAt = new Date(`${date}T00:00:00`).toISOString();
      endsAt = null;
    } else {
      const start = new Date(`${date}T${startTime || "00:00"}`);
      if (Number.isNaN(start.getTime())) {
        toast.error("Ongeldige begintijd.");
        return;
      }
      startsAt = start.toISOString();
      endsAt = endTime ? new Date(`${date}T${endTime}`).toISOString() : null;
    }

    startSave(async () => {
      let result;
      let successMessage;
      if (!event && destination === "google") {
        result = await createGoogleCalendarEvent({
          title,
          startsAt,
          endsAt,
          allDay,
          location,
          notes,
        });
        successMessage = "Toegevoegd aan Google Agenda";
      } else if (event) {
        result = await updateEvent(event.id, {
          title,
          startsAt,
          endsAt,
          allDay,
          location,
          notes,
          color,
        });
        successMessage = "Afspraak bijgewerkt";
      } else {
        result = await createEvent({
          title,
          startsAt,
          endsAt,
          allDay,
          location,
          notes,
          color,
        });
        successMessage = "Afspraak toegevoegd";
      }

      if (result.ok) {
        toast.success(successMessage);
        onClose();
      } else {
        toast.error("Opslaan mislukt", { description: result.error });
      }
    });
  }

  function remove() {
    if (!event || !window.confirm("Deze afspraak verwijderen?")) return;
    startDelete(async () => {
      const result = await deleteEvent(event.id);
      if (result.ok) {
        toast.success("Afspraak verwijderd");
        onClose();
      } else {
        toast.error("Verwijderen mislukt", { description: result.error });
      }
    });
  }

  return (
    <>
      <div className="grid gap-4">
        {!event && googleConnected && (
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <SegButton
              active={destination === "local"}
              onClick={() => setDestination("local")}
            >
              ONRAJ
            </SegButton>
            <SegButton
              active={destination === "google"}
              onClick={() => setDestination("google")}
            >
              Google
            </SegButton>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="ev-title">Titel</Label>
          <Input
            id="ev-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Waar gaat het over?"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ev-date">Datum</Label>
          <Input
            id="ev-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <SegButton active={!allDay} onClick={() => setAllDay(false)}>
            Tijdstip
          </SegButton>
          <SegButton active={allDay} onClick={() => setAllDay(true)}>
            Hele dag
          </SegButton>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ev-start">Begin</Label>
              <Input
                id="ev-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-end">Einde</Label>
              <Input
                id="ev-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="ev-location">Locatie</Label>
          <Input
            id="ev-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optioneel"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ev-notes">Notities</Label>
          <Textarea
            id="ev-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optioneel"
            className="min-h-20"
          />
        </div>

        <div className="grid gap-2">
          <Label>Kleur</Label>
          <div className="flex gap-2">
            {EVENT_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={option.name}
                onClick={() => setColor(option.value)}
                className={cn(
                  "size-7 rounded-full ring-offset-2 ring-offset-background transition",
                  color === option.value && "ring-2 ring-foreground",
                )}
                style={{ backgroundColor: option.value }}
              />
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        {event ? (
          <Button
            variant="ghost"
            onClick={remove}
            disabled={busy}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" /> Verwijderen
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annuleren
          </Button>
          <Button onClick={save} disabled={busy}>
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
