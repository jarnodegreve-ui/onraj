"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isMissingColumn } from "@/lib/data/safe";
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
  category: z.string().trim().max(60).nullable().optional(),
});

export type NoteInput = z.infer<typeof noteInput>;

type DbClient = Awaited<ReturnType<typeof createClient>>;

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

// Schrijft een notitie-rij (insert of update). Valt terug zonder category als
// migratie 0009 nog niet gedraaid is, zodat notitie-CRUD blijft werken.
async function writeNote(
  supabase: DbClient,
  payload: Record<string, unknown>,
  id?: string,
) {
  const run = (data: Record<string, unknown>) =>
    id
      ? supabase.from("notes").update(data).eq("id", id).select("*").single()
      : supabase.from("notes").insert(data).select("*").single();

  let result = await run(payload);
  if (result.error && isMissingColumn(result.error) && "category" in payload) {
    const fallback = { ...payload };
    delete fallback.category;
    result = await run(fallback);
  }
  return result;
}

function toPayload(data: NoteInput) {
  return {
    title: data.title,
    body: data.body,
    tags: data.tags,
    pinned: data.pinned,
    category: data.category || null,
  };
}

export async function createNote(input: NoteInput): Promise<ActionResult> {
  const check = validate(input);
  if (!check.ok || !check.data) return check;

  const supabase = await createClient();
  const { data, error } = await writeNote(supabase, toPayload(check.data));
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
  // select("*") is veilig ook als de category-kolom nog niet bestaat.
  const { data: existing } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();
  const oldPath = existing
    ? noteFilePath(
        existing.title as string,
        existing.id as string,
        (existing.category as string | null) ?? null,
      )
    : null;

  const { data, error } = await writeNote(supabase, toPayload(check.data), id);
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

// Enkel de categorie wijzigen — voor slepen naar een andere categoriekaart.
// Verplaatst ook het vault-bestand mee naar de nieuwe categoriemap.
export async function setNoteCategory(
  id: string,
  category: string | null,
): Promise<ActionResult> {
  const clean = category?.trim().slice(0, 60) || null;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();
  const oldPath = existing
    ? noteFilePath(
        existing.title as string,
        existing.id as string,
        (existing.category as string | null) ?? null,
      )
    : null;

  const { data, error } = await supabase
    .from("notes")
    .update({ category: clean })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (isMissingColumn(error)) return { ok: true }; // categorie-kolom nog niet
    return { ok: false, error: error.message };
  }

  if (data) await syncNoteFile(toNote(data), oldPath);
  revalidateNotes();
  return { ok: true };
}

// Zachte verwijdering: verbergt de notitie in het portaal maar bewaart het
// vault-bestand (met archived: true in de frontmatter). archived=false herstelt.
export async function archiveNote(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .update({ archived })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (isMissingColumn(error)) {
      return {
        ok: false,
        error: "Draai eerst migratie 0010 om te kunnen archiveren.",
      };
    }
    return { ok: false, error: error.message };
  }

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
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  if (data) {
    await removeNoteFile(
      noteFilePath(
        data.title as string,
        data.id as string,
        (data.category as string | null) ?? null,
      ),
    );
  }
  revalidateNotes();
  return { ok: true };
}
