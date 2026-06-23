"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isMissingColumn } from "@/lib/data/safe";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const isoDate = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Ongeldige datum/tijd.");

const eventInput = z.object({
  title: z.string().trim().min(1, "Geef een titel.").max(200),
  startsAt: isoDate,
  endsAt: isoDate.nullable(),
  allDay: z.boolean(),
  location: z.string().trim().max(200),
  notes: z.string().trim().max(5000),
  color: z.string().trim().max(20),
});

export type EventInput = z.infer<typeof eventInput>;

function toRow(input: EventInput) {
  return {
    title: input.title,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    all_day: input.allDay,
    location: input.location || null,
    notes: input.notes || null,
    color: input.color || null,
  };
}

function revalidateAgenda() {
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

function parse(input: EventInput) {
  const parsed = eventInput.safeParse(input);
  if (parsed.success) {
    if (
      parsed.data.endsAt &&
      Date.parse(parsed.data.endsAt) < Date.parse(parsed.data.startsAt)
    ) {
      return { ok: false as const, error: "Einde ligt vóór het begin." };
    }
    return { ok: true as const, data: parsed.data };
  }
  return {
    ok: false as const,
    error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
  };
}

export async function createEvent(input: EventInput): Promise<ActionResult> {
  const result = parse(input);
  if (!result.ok) return result;

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert(toRow(result.data));
  if (error) return { ok: false, error: error.message };

  revalidateAgenda();
  return { ok: true };
}

export async function updateEvent(
  id: string,
  input: EventInput,
): Promise<ActionResult> {
  const result = parse(input);
  if (!result.ok) return result;

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update(toRow(result.data))
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateAgenda();
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // Soft delete: naar de prullenbak. Vóór migratie 0018 → hard delete.
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    if (isMissingColumn(error)) {
      const { error: delErr } = await supabase
        .from("events")
        .delete()
        .eq("id", id);
      if (delErr) return { ok: false, error: delErr.message };
    } else {
      return { ok: false, error: error.message };
    }
  }
  revalidateAgenda();
  return { ok: true };
}

export async function restoreEvent(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateAgenda();
  return { ok: true };
}

// Definitief verwijderen (vanuit de prullenbak).
export async function purgeEvent(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateAgenda();
  return { ok: true };
}
