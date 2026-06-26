"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Check, FileText, ListTodo, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  clearInbox,
  convertNoteToTask,
  convertTaskToNote,
  deleteInboxItem,
  restoreInboxItem,
} from "@/lib/actions/inbox";
import { setNoteCategory } from "@/lib/actions/notes";
import { setTaskCategory } from "@/lib/actions/tasks";
import type { ActionResult } from "@/lib/actions/result";
import type { InboxItem } from "@/lib/data/inbox";

export function InboxManager({
  items,
  taskCategories,
  noteCategories,
}: {
  items: InboxItem[];
  taskCategories: string[];
  noteCategories: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function run(
    key: string,
    fn: () => Promise<ActionResult>,
    okMsg: string,
  ) {
    setBusy(key);
    startTransition(async () => {
      const result = await fn();
      setBusy(null);
      if (result.ok) {
        toast.success(okMsg);
        router.refresh();
      } else {
        toast.error("Mislukt", { description: result.error });
      }
    });
  }

  // Per ongeluk toegevoegd? Soft-delete naar de prullenbak, met undo.
  function remove(item: InboxItem) {
    const key = `${item.kind}-${item.id}`;
    setBusy(key);
    startTransition(async () => {
      const result = await deleteInboxItem(item.kind, item.id);
      setBusy(null);
      if (result.ok) {
        toast.success("Naar prullenbak", {
          action: {
            label: "Ongedaan maken",
            onClick: () =>
              startTransition(async () => {
                const r = await restoreInboxItem(item.kind, item.id);
                if (r.ok) router.refresh();
                else
                  toast.error("Terugzetten mislukt", { description: r.error });
              }),
          },
        });
        router.refresh();
      } else {
        toast.error("Verwijderen mislukt", { description: result.error });
      }
    });
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Je inbox is leeg 🎉 Alles wat je via Telegram inspreekt, fotografeert
          of typt, landt hier om snel te triëren.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const cats = item.kind === "taak" ? taskCategories : noteCategories;
        const key = `${item.kind}-${item.id}`;
        const Icon = item.kind === "taak" ? ListTodo : FileText;
        const disabled = pending && busy === key;
        const accent = item.kind === "taak" ? "#f59e0b" : "#3d68be";

        return (
          <li key={key}>
            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: `${accent}1a`, color: accent }}
                  >
                    {item.kind}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={item.category ?? ""}
                    disabled={disabled}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      run(
                        key,
                        () =>
                          item.kind === "taak"
                            ? setTaskCategory(item.id, val)
                            : setNoteCategory(item.id, val),
                        "Categorie gezet",
                      );
                    }}
                  >
                    <option value="">— categorie —</option>
                    {cats.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() =>
                      run(
                        key,
                        () =>
                          item.kind === "taak"
                            ? convertTaskToNote(item.id)
                            : convertNoteToTask(item.id),
                        item.kind === "taak"
                          ? "Omgezet naar notitie"
                          : "Omgezet naar taak",
                      )
                    }
                  >
                    <ArrowLeftRight className="size-4" />
                    {item.kind === "taak" ? "→ Notitie" : "→ Taak"}
                  </Button>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      disabled={disabled}
                      aria-label="Verwijderen"
                      onClick={() => remove(item)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      disabled={disabled}
                      onClick={() =>
                        run(key, () => clearInbox(item.kind, item.id), "Verwerkt")
                      }
                    >
                      <Check className="size-4" /> Verwerkt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
