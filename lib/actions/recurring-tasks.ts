"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { currentDayKey } from "@/lib/agenda";
import { isMissingTable } from "@/lib/data/safe";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const MIGRATIE_HINT = "Draai eerst migratie 0016 voor terugkerende taken.";

const input = z
  .object({
    title: z.string().trim().min(1, "Geef een titel.").max(200),
    notes: z.string().trim().max(2000).nullable().optional(),
    priority: z.enum(["laag", "middel", "hoog"]),
    category: z.string().trim().max(60).nullable().optional(),
    frequency: z.enum(["dagelijks", "wekelijks", "maandelijks"]),
    weekday: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  })
  .refine((d) => d.frequency !== "wekelijks" || d.weekday != null, {
    message: "Kies een weekdag.",
  })
  .refine((d) => d.frequency !== "maandelijks" || d.dayOfMonth != null, {
    message: "Kies een dag van de maand.",
  });

export type RecurringTaskInput = z.infer<typeof input>;

function revalidate() {
  revalidatePath("/taken");
  revalidatePath("/dashboard");
}

// Velden naar de DB-rij; weekday/day_of_month enkel relevant voor hun frequentie.
function toRow(data: RecurringTaskInput) {
  return {
    title: data.title,
    notes: data.notes || null,
    priority: data.priority,
    category: data.category || null,
    frequency: data.frequency,
    weekday: data.frequency === "wekelijks" ? (data.weekday ?? null) : null,
    day_of_month:
      data.frequency === "maandelijks" ? (data.dayOfMonth ?? null) : null,
  };
}

export async function createRecurringTask(
  raw: RecurringTaskInput,
): Promise<ActionResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_tasks")
    .insert({ ...toRow(parsed.data), start_on: currentDayKey() });
  if (error) {
    if (isMissingTable(error)) return { ok: false, error: MIGRATIE_HINT };
    return { ok: false, error: error.message };
  }

  revalidate();
  return { ok: true };
}

export async function updateRecurringTask(
  id: string,
  raw: RecurringTaskInput,
): Promise<ActionResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_tasks")
    .update(toRow(parsed.data))
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function setRecurringTaskActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_tasks")
    .update({ active })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteRecurringTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_tasks")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}
