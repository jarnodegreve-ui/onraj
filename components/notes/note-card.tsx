"use client";

import { useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArchiveRestore,
  GripVertical,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryBadge } from "@/components/category-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// Ruwe markdown → leesbare tekstsnippet voor de kaart.
function toSnippet(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`~[\]()!-]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function NoteCard({
  note,
  onEdit,
  draggable,
  categoryColor,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  draggable: boolean;
  categoryColor?: string | null;
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
  const snippet = toSnippet(note.body);

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
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex h-full flex-col transition-colors",
        note.pinned && "border-primary/30 bg-primary/[0.02]",
        isDragging && "z-10 opacity-80",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1.5">
            {draggable && (
              <button
                type="button"
                className="mt-0.5 cursor-grab touch-none text-muted-foreground/60 hover:text-foreground"
                aria-label="Versleep notitie"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="size-4" />
              </button>
            )}
            <CardTitle className="line-clamp-2 text-base">
              {note.title || "Naamloos"}
            </CardTitle>
          </div>
          <div className="-mr-1 flex shrink-0 items-center">
            {!note.archived && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={togglePin}
                disabled={pending}
                aria-label={note.pinned ? "Losmaken" : "Vastpinnen"}
              >
                {note.pinned ? (
                  <Pin className="size-4 text-primary" />
                ) : (
                  <PinOff className="size-4 text-muted-foreground" />
                )}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
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
                    <DropdownMenuItem onClick={() => archive(true)}>
                      <Archive />
                      Archiveren
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {snippet ? (
          <p className="line-clamp-4 text-sm whitespace-pre-wrap text-muted-foreground">
            {snippet}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Geen inhoud</p>
        )}
      </CardContent>
      <CardFooter className="flex-wrap items-center gap-1.5">
        {note.category && (
          <CategoryBadge name={note.category} color={categoryColor} />
        )}
        {note.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {fromNow(note.updatedAt)}
        </span>
      </CardFooter>
    </Card>
  );
}
