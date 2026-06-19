"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isMissingColumn } from "@/lib/data/safe";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const taskInput = z.object({
  title: z.string().trim().min(1, "Geef een titel.").max(200),
  dueOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum.")
    .nullable(),
  notes: z.string().trim().max(2000),
  priority: z.enum(["laag", "middel", "hoog"]),
});

export type TaskInput = z.infer<typeof taskInput>;

function toRow(input: TaskInput) {
  return {
    title: input.title,
    due_on: input.dueOn,
    notes: input.notes || null,
    priority: input.priority,
  };
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
    // priority-kolom bestaat nog niet (migratie 0004) → zonder opslaan.
    ({ error } = await supabase
      .from("tasks")
      .insert({ title: row.title, due_on: row.due_on, notes: row.notes }));
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
      .update({ title: row.title, due_on: row.due_on, notes: row.notes })
      .eq("id", id));
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

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateTasks();
  return { ok: true };
}
