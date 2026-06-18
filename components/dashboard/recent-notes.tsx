import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fromNow } from "@/lib/format";
import type { Note } from "@/lib/types";

export function RecentNotes({ notes }: { notes: Note[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recente notities</CardTitle>
        <CardAction>
          <Link
            href="/notities"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Alle <ArrowRight className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Nog geen notities.</p>
        ) : (
          <ul className="space-y-1">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href="/notities"
                  className="block rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {note.title || "Naamloos"}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fromNow(note.updatedAt)}
                    </span>
                  </div>
                  {note.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
