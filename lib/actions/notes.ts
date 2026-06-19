"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toNote } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import { noteFilePath } from "@/lib/vault";
import { removeNoteFile, syncNoteFile } from "@/lib/vault-sync";
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
  const { data, error } = await supabase
    .from("notes")
    .insert(check.data)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  await syncNoteFile(toNote(data), null);
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
  const { data: existing } = await supabase
    .from("notes")
    .select("id, title")
    .eq("id", id)
    .single();
  const oldPath = existing
    ? noteFilePath(existing.title as string, existing.id as string)
    : null;

  const { data, error } = await supabase
    .from("notes")
    .update(check.data)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  await syncNoteFile(toNote(data), oldPath);
  revalidateNotes();
  return { ok: true };
}

export async function setNotePinned(
  id: string,
  pinned: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .update({ pinned })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  await syncNoteFile(toNote(data), null);
  revalidateNotes();
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .select("id, title")
    .single();
  if (error) return { ok: false, error: error.message };

  if (data) {
    await removeNoteFile(noteFilePath(data.title as string, data.id as string));
  }
  revalidateNotes();
  return { ok: true };
}
