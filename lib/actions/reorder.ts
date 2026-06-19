"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isMissingColumn } from "@/lib/data/safe";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const idsInput = z.array(z.string().min(1).max(64)).max(2000);

async function reorder(
  table: "tasks" | "notes",
  ids: string[],
  paths: string[],
): Promise<ActionResult> {
  const parsed = idsInput.safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Ongeldige volgorde." };

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map((id, index) =>
      supabase.from(table).update({ position: index }).eq("id", id),
    ),
  );

  const failed = results.find((result) => result.error)?.error;
  if (failed) {
    if (isMissingColumn(failed)) {
      return {
        ok: false,
        error: "Draai eerst migratie 0007 om de volgorde te bewaren.",
      };
    }
    return { ok: false, error: failed.message };
  }

  paths.forEach((path) => revalidatePath(path));
  return { ok: true };
}

export async function reorderTasks(ids: string[]): Promise<ActionResult> {
  return reorder("tasks", ids, ["/taken", "/dashboard"]);
}

export async function reorderNotes(ids: string[]): Promise<ActionResult> {
  return reorder("notes", ids, ["/notities", "/dashboard"]);
}
