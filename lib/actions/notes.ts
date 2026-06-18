"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const noteInput = z.object({
  title: z.string().trim().max(200),
  body: z.string().max(50000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  pinned: z.boolean(),
});

export type NoteInput = z.infer<typeof noteInput>;

function revalidateNotes() {
  revalidatePath("/notities");
  revalidatePath("/dashboard");
}

function validate(input: NoteInput): ActionResult & { data?: NoteInput } {
  const parsed = noteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer." };
  if (!parsed.data.title && !parsed.data.body) {
    return { ok: false, error: "Geef minstens een titel of inhoud." };
  }
  return { ok: true, data: parsed.data };
}

export async function createNote(input: NoteInput): Promise<ActionResult> {
  const check = validate(input);
  if (!check.ok || !check.data) return check;

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert(check.data);
  if (error) return { ok: false, error: error.message };

  revalidateNotes();
  return { ok: true };
}

export async function updateNote(
  id: string,
  input: NoteInput,
): Promise<ActionResult> {
  const check = validate(input);
  if (!check.ok || !check.data) return check;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .update(check.data)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateNotes();
  return { ok: true };
}

export async function setNotePinned(
  id: string,
  pinned: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .update({ pinned })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateNotes();
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateNotes();
  return { ok: true };
}
