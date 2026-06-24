"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isMissingColumn } from "@/lib/data/safe";
import { createClient } from "@/lib/supabase/server";
import type { Subtask } from "@/lib/types";
import type { ActionResult } from "./result";

const taskInput = z.object({
  title: z.string().trim().min(1, "Geef een titel.").max(200),
  dueOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum.")
    .nullable(),
  notes: z.string().trim().max(2000),
  priority: z.enum(["laag", "middel", "hoog"]),
  category: z.string().trim().max(60).nullable().optional(),
});

export type TaskInput = z.infer<typeof taskInput>;

function toRow(input: TaskInput) {
  return {
    title: input.title,
    due_on: input.dueOn,
    notes: input.notes || null,
    priority: input.priority,
    category: input.category || null,
  };
}

type TaskRowInsert = ReturnType<typeof toRow>;

// Progressief vangnet: eerst zonder category (migratie 0011), dan zonder
// priority (migratie 0004), zodat opslaan altijd lukt vóór een migratie draait.
function withoutCategory(row: TaskRowInsert) {
  return {
    title: row.title,
    due_on: row.due_on,
    notes: row.notes,
    priority: row.priority,
  };
}
function minimalRow(row: TaskRowInsert) {
  return { title: row.title, due_on: row.due_on, notes: row.notes };
}

function revalidateTasks() {
  revalidatePath("/taken");
  revalidatePath("/dashboard");
}

export async function createTask(input: TaskInput): Promise<ActionResult> {
  const parsed = taskInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const row = toRow(parsed.data);
  let { error } = await supabase.from("tasks").insert(row);
  if (error && isMissingColumn(error)) {
    ({ error } = await supabase.from("tasks").insert(withoutCategory(row)));
    if (error && isMissingColumn(error)) {
      ({ error } = await supabase.from("tasks").insert(minimalRow(row)));
    }
  }
  if (error) return { ok: false, error: error.message };

  revalidateTasks();
  return { ok: true };
}

export async function updateTask(
  id: string,
  input: TaskInput,
): Promise<ActionResult> {
  const parsed = taskInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const row = toRow(parsed.data);
  let { error } = await supabase.from("tasks").update(row).eq("id", id);
  if (error && isMissingColumn(error)) {
    ({ error } = await supabase
      .from("tasks")
      .update(withoutCategory(row))
      .eq("id", id));
    if (error && isMissingColumn(error)) {
      ({ error } = await supabase
        .from("tasks")
        .update(minimalRow(row))
        .eq("id", id));
    }
  }
  if (error) return { ok: false, error: error.message };

  revalidateTasks();
  return { ok: true };
}

export async function setTaskDone(
  id: string,
  done: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateTasks();
  return { ok: true };
}

// Subtaken / checklist: de client houdt de volledige lijst bij (optimistisch
// toggelen/toevoegen/verwijderen) en stuurt ze in hun geheel terug — geen
// read-modify-write op de server, dus geen race. Saneer hard met zod.
const subtasksInput = z
  .array(
    z.object({
      id: z.string().trim().min(1).max(60),
      title: z.string().trim().min(1).max(200),
      done: z.boolean(),
    }),
  )
  .max(50, "Maximaal 50 deelstappen.");

export async function updateSubtasks(
  id: string,
  subtasks: Subtask[],
): Promise<ActionResult> {
  const parsed = subtasksInput.safeParse(subtasks);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige deelstap.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ subtasks: parsed.data })
    .eq("id", id);
  if (error) {
    // Kolom bestaat nog niet (migratie 0021) → stil negeren i.p.v. falen.
    if (isMissingColumn(error)) return { ok: true };
    return { ok: false, error: error.message };
  }

  revalidateTasks();
  return { ok: true };
}

// Enkel de categorie wijzigen — voor slepen naar een andere categoriekaart.
export async function setTaskCategory(
  id: string,
  category: string | null,
): Promise<ActionResult> {
  const clean = category?.trim().slice(0, 60) || null;
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ category: clean })
    .eq("id", id);
  if (error) {
    if (isMissingColumn(error)) return { ok: true }; // categorie-kolom nog niet
    return { ok: false, error: error.message };
  }

  revalidateTasks();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // Soft delete: naar de prullenbak. Vóór migratie 0018 → hard delete.
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    if (isMissingColumn(error)) {
      const { error: delErr } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);
      if (delErr) return { ok: false, error: delErr.message };
    } else {
      return { ok: false, error: error.message };
    }
  }
  revalidateTasks();
  return { ok: true };
}

export async function restoreTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateTasks();
  return { ok: true };
}

// Definitief verwijderen (vanuit de prullenbak).
export async function purgeTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateTasks();
  return { ok: true };
}
