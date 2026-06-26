"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TrashItem, TrashType } from "@/lib/data/trash";
import { purgeTrashItem, restoreTrashItem } from "@/lib/actions/trash";
import { fromNow } from "@/lib/format";

const TYPE_LABEL: Record<TrashType, string> = {
  taak: "Taak",
  notitie: "Notitie",
  transactie: "Transactie",
  afspraak: "Afspraak",
};

const TYPE_COLOR: Record<TrashType, string> = {
  taak: "#c98a3d",
  notitie: "#3d68be",
  transactie: "#5b8c5a",
  afspraak: "#be5b3c",
};

export function TrashManager({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function restore(item: TrashItem) {
    setBusyId(item.id);
    startTransition(async () => {
      const result = await restoreTrashItem(item.type, item.id);
      setBusyId(null);
      if (result.ok) {
        toast.success("Teruggezet");
        router.refresh();
      } else {
        toast.error("Terugzetten mislukt", { description: result.error });
      }
    });
  }

  function purge(item: TrashItem) {
    if (
      !window.confirm(
        `"${item.label}" definitief verwijderen? Dit kan niet ongedaan gemaakt worden.`,
      )
    )
      return;
    setBusyId(item.id);
    startTransition(async () => {
      const result = await purgeTrashItem(item.type, item.id);
      setBusyId(null);
      if (result.ok) {
        toast.success("Definitief verwijderd");
        router.refresh();
      } else {
        toast.error("Verwijderen mislukt", { description: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trash className="size-4 text-muted-foreground" /> Prullenbak
        </CardTitle>
        <CardDescription>
          Verwijderde items blijven 30 dagen bewaard en worden daarna automatisch
          opgeruimd.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            De prullenbak is leeg.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-3 py-3"
              >
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${TYPE_COLOR[item.type]}1a`,
                    color: TYPE_COLOR[item.type],
                  }}
                >
                  {TYPE_LABEL[item.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.sublabel} · {fromNow(item.deletedAt)} verwijderd
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending && busyId === item.id}
                  onClick={() => restore(item)}
                >
                  <RotateCcw className="size-4" />
                  <span className="hidden sm:inline">Terugzetten</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-rose-600"
                  disabled={pending && busyId === item.id}
                  onClick={() => purge(item)}
                  aria-label="Definitief verwijderen"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
