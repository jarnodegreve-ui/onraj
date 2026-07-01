"use client";

import { useRef, useState, useTransition } from "react";
import { ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  restoreBackup,
  type RestoreTableReport,
} from "@/lib/actions/restore";

/** Zet een ONRAJ-backup (JSON uit de wekelijkse Telegram-backup of /backup)
 *  terug. Niet-destructief: upsert op id — niets wordt verwijderd. */
export function RestoreCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [report, setReport] = useState<RestoreTableReport[] | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Kies eerst een backupbestand (.json).");
      return;
    }
    if (
      !window.confirm(
        "Backup terugzetten? Bestaande records met dezelfde id worden overschreven met de backup-versie; er wordt niets verwijderd.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("backup", file);
      const result = await restoreBackup(formData);
      if (!result.tables) {
        toast.error("Terugzetten mislukt", { description: result.error });
        return;
      }
      setReport(result.tables);
      const total = result.tables.reduce((sum, t) => sum + t.count, 0);
      if (result.ok) {
        toast.success(`Backup teruggezet — ${total} records.`);
      } else {
        toast.warning("Gedeeltelijk teruggezet", {
          description: "Bekijk het overzicht hieronder.",
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Backup terugzetten</CardTitle>
        <CardDescription>
          Herstel je data uit een ONRAJ-backup (het JSON-bestand van de
          wekelijkse Telegram-backup of /backup).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          disabled={pending}
          aria-label="Backupbestand"
          onChange={(event) => {
            setFileName(event.target.files?.[0]?.name ?? null);
            setReport(null);
          }}
        />
        <Button
          variant="outline"
          onClick={run}
          disabled={pending || !fileName}
        >
          <ArchiveRestore className="size-4" />
          {pending ? "Terugzetten…" : "Terugzetten"}
        </Button>

        {report && (
          <ul className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
            {report.map((t) => (
              <li key={t.table} className="flex justify-between gap-2">
                <span className="truncate">{t.table}</span>
                <span className="shrink-0 tabular-nums">
                  {t.error ? `⚠️ ${t.error}` : `${t.count} ✓`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
