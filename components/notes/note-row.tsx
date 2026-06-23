"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryBadge } from "@/components/category-badge";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveNote, deleteNote, setNotePinned } from "@/lib/actions/notes";
import { fromNow } from "@/lib/format";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NoteRow({
  note,
  onEdit,
  draggable,
  categoryColor,
  hideCategory = false,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  draggable: boolean;
  categoryColor?: string | null;
  hideCategory?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id, disabled: !draggable });
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function togglePin() {
    startTransition(async () => {
      const result = await setNotePinned(note.id, !note.pinned);
      if (!result.ok) toast.error("Pinnen mislukt", { description: result.error });
    });
  }

  function archive(archived: boolean) {
    startTransition(async () => {
      const result = await archiveNote(note.id, archived);
      if (result.ok) toast.success(archived ? "Gearchiveerd" : "Hersteld");
      else toast.error("Mislukt", { description: result.error });
    });
  }

  function remove() {
    if (
      !window.confirm(
        "Deze notitie definitief verwijderen? Ook het bestand in je vault wordt verwijderd. Dit kan niet ongedaan gemaakt worden.",
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteNote(note.id);
      if (result.ok) toast.success("Definitief verwijderd");
      else toast.error("Verwijderen mislukt", { description: result.error });
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card transition-colors",
        note.pinned && "bg-primary/[0.03]",
        isDragging && "opacity-0",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {draggable && (
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground"
            aria-label="Versleep notitie"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          {note.pinned && (
            <Pin className="size-3.5 shrink-0 text-primary" />
          )}
          <span className="truncate text-sm font-medium">
            {note.title || "Naamloos"}
          </span>
          {!hideCategory && note.category && (
            <CategoryBadge name={note.category} color={categoryColor} />
          )}
        </button>
        <span className="shrink-0 text-xs text-muted-foreground">
          {fromNow(note.updatedAt)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label="Meer acties"
              >
                <MoreVertical className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {note.archived ? (
              <>
                <DropdownMenuItem onClick={() => archive(false)}>
                  <ArchiveRestore />
                  Herstellen
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={remove}>
                  <Trash2 />
                  Definitief verwijderen
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => onEdit(note)}>
                  <Pencil />
                  Bewerken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={togglePin} disabled={pending}>
                  {note.pinned ? <PinOff /> : <Pin />}
                  {note.pinned ? "Losmaken" : "Vastpinnen"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => archive(true)}>
                  <Archive />
                  Archiveren
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open && (
        <div className="border-t px-3 py-3 pl-9">
          {note.body.trim() ? (
            <Markdown>{note.body}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground italic">Geen inhoud</p>
          )}
          {note.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {!note.archived && (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => onEdit(note)}>
                <Pencil className="size-4" /> Bewerken
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
