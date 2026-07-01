"use server";

import { revalidatePath } from "next/cache";

import { BACKUP_TABLES } from "@/lib/backup";
import { isMissingTable } from "@/lib/data/safe";
import { createClient, getSessionUser } from "@/lib/supabase/server";

const MAX_BYTES = 25 * 1024 * 1024; // ruim boven een normale backup
const CHUNK = 500;

export interface RestoreTableReport {
  table: string;
  count: number;
  error?: string;
}

export interface RestoreReport {
  ok: boolean;
  error?: string;
  tables?: RestoreTableReport[];
}

/**
 * Zet een ONRAJ-backup (het JSON-bestand uit de wekelijkse Telegram-backup of
 * /backup) terug. Niet-destructief: rijen worden ge-upsert op id — bestaande
 * records met dezelfde id worden overschreven met de backup-versie, al het
 * andere blijft staan. user_id wordt herschreven naar de ingelogde gebruiker,
 * zodat herstel ook werkt in een vers Supabase-project (andere user-id).
 * Draait via de gewone RLS-client: er kan per definitie alleen in de eigen
 * account geschreven worden.
 */
export async function restoreBackup(formData: FormData): Promise<RestoreReport> {
  const file = formData.get("backup");
  if (!(file instanceof File)) {
    return { ok: false, error: "Geen bestand ontvangen." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Bestand te groot (max 25 MB)." };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  let payload: {
    app?: unknown;
    data?: Record<string, unknown>;
  };
  try {
    payload = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "Geen geldig JSON-bestand." };
  }
  if (payload?.app !== "ONRAJ" || typeof payload.data !== "object" || !payload.data) {
    return { ok: false, error: "Dit is geen ONRAJ-backupbestand." };
  }

  const supabase = await createClient();
  const tables: RestoreTableReport[] = [];

  // Vaste whitelist in vaste volgorde (ouders vóór kinderen) — nooit de sleutels
  // van het bestand zelf volgen.
  for (const table of BACKUP_TABLES) {
    const raw = payload.data[table];
    if (!Array.isArray(raw) || raw.length === 0) continue;

    const rows = raw
      .filter((row): row is Record<string, unknown> => {
        return !!row && typeof row === "object" && !Array.isArray(row);
      })
      .map((row) => ({ ...row, user_id: user.id }));
    if (rows.length === 0) continue;

    let count = 0;
    let errorMessage: string | undefined;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from(table)
        .upsert(chunk, { onConflict: "id" });
      if (error) {
        // Tabel bestaat hier (nog) niet → overslaan met duidelijke melding.
        errorMessage = isMissingTable(error)
          ? "tabel bestaat niet — draai eerst de migraties"
          : error.message;
        break;
      }
      count += chunk.length;
    }
    tables.push({ table, count, error: errorMessage });
  }

  revalidatePath("/", "layout");
  return { ok: tables.every((t) => !t.error), tables };
}
