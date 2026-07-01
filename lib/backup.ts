import "server-only";

import { isMissingTable } from "@/lib/data/safe";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// Tabellen die in de backup gaan. BEWUST uitgesloten: google_tokens (OAuth-
// secrets) en push_subscriptions (apparaat-specifiek, geen brondata). Van
// attachments gaat enkel de metadata mee; de binaire bestanden staan in Storage.
// De volgorde is ook de herstel-volgorde: ouders vóór kinderen
// (recurring_transactions vóór transactions, holdings vóór holding_prices).
export const BACKUP_TABLES = [
  "notes",
  "recurring_transactions",
  "transactions",
  "events",
  "tasks",
  "savings_goals",
  "budgets",
  "recurring_tasks",
  "account_balances",
  "categories",
  "app_settings",
  "attachments",
  "holdings",
  "holding_prices",
  "subscriptions",
] as const;

// Datumsleutel YYYY-MM-DD in Brusselse tijd (voor de bestandsnaam).
export function brusselsDateKey(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(now);
}

export interface BackupResult {
  filename: string;
  contents: string;
  summary: string;
  /** Tabellen die niet gelezen konden worden — de backup is dan onvolledig. */
  failed: string[];
}

// Bouwt een volledige JSON-backup van alle brondata van de eigenaar. De
// service-role-client omzeilt RLS; we scope'n expliciet op user_id. Een tabel
// die (nog) niet bestaat of geen user_id heeft, levert een lege lijst op i.p.v.
// een crash.
export async function buildBackup(
  admin: Admin,
  ownerId: string,
  now: Date,
): Promise<BackupResult> {
  const dateKey = brusselsDateKey(now);
  const data: Record<string, unknown[]> = {};
  const counts: string[] = [];
  const failed: string[] = [];

  for (const table of BACKUP_TABLES) {
    const { data: rows, error } = await admin
      .from(table)
      .select("*")
      .eq("user_id", ownerId);
    if (error) {
      // Een tabel die (nog) niet bestaat is legitiem (migratie nog niet
      // gedraaid) → stil overslaan. Elke andere fout maakt de backup
      // onvolledig en MOET zichtbaar zijn — anders lijkt hij geslaagd.
      if (!isMissingTable(error)) failed.push(table);
      data[table] = [];
      continue;
    }
    const list = rows ?? [];
    data[table] = list;
    if (list.length > 0) counts.push(`${table}: ${list.length}`);
  }

  const payload = {
    app: "ONRAJ",
    version: 1,
    generated_at: now.toISOString(),
    owner: ownerId,
    note: "Bijlage-binaries zitten niet in deze export (alleen metadata). google_tokens en push_subscriptions zijn bewust uitgesloten.",
    data,
  };

  const totalRows = Object.values(data).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  const summary =
    `${totalRows} records — ${counts.join(", ") || "leeg"}` +
    (failed.length > 0
      ? `\n⚠️ ONVOLLEDIG — niet gelezen: ${failed.join(", ")}`
      : "");

  return {
    filename: `onraj-backup-${dateKey}.json`,
    contents: JSON.stringify(payload, null, 2),
    summary,
    failed,
  };
}
