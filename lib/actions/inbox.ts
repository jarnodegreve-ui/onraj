"use server";

import { revalidatePath } from "next/cache";

import { isMissingColumn } from "@/lib/data/safe";
import type { InboxKind } from "@/lib/data/inbox";
import { toNote } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import { noteFilePath } from "@/lib/vault";
import { removeNoteFile, syncNoteFile } from "@/lib/vault-sync";
import { deleteNote, restoreNote } from "./notes";
import type { ActionResult } from "./result";
import { deleteTask, restoreTask } from "./tasks";

function revalidateInbox() {
  revalidatePath("/inbox");
  revalidatePath("/taken");
  revalidatePath("/notities");
  revalidatePath("/dashboard");
}

// Markeer een capture als verwerkt (haal uit de inbox).
export async function clearInbox(
  kind: InboxKind,
  id: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const table = kind === "taak" ? "tasks" : "notes";
  const { error } = await supabase
    .from(table)
    .update({ inbox: false })
    .eq("id", id);
  if (error) {
    if (isMissingColumn(error)) return { ok: true };
    return { ok: false, error: error.message };
  }
  revalidateInbox();
  return { ok: true };
}

// Verwijder een capture rechtstreeks vanuit de inbox — soft-delete naar de
// prullenbak (met undo), zodat per ongeluk toegevoegde items snel weg kunnen.
export async function deleteInboxItem(
  kind: InboxKind,
  id: string,
): Promise<ActionResult> {
  return kind === "taak" ? deleteTask(id) : deleteNote(id);
}

export async function restoreInboxItem(
  kind: InboxKind,
  id: string,
): Promise<ActionResult> {
  return kind === "taak" ? restoreTask(id) : restoreNote(id);
}

// Zet een taak om naar een notitie (inhoud verhuist; de taak verdwijnt).
export async function convertTaskToNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !task) {
    return { ok: false, error: error?.message ?? "Taak niet gevonden." };
  }

  const row = {
    title: (task.title as string) || "Naamloos",
    body: (task.notes as string) || "",
    category: (task.category as string | null) ?? null,
    tags: ["telegram"],
    pinned: false,
    inbox: true,
  };
  let result = await supabase.from("notes").insert(row).select("*").single();
  if (result.error && isMissingColumn(result.error)) {
    // Vóór migratie 0020: zonder inbox-vlag.
    const { inbox: _inbox, ...withoutInbox } = row;
    void _inbox;
    result = await supabase.from("notes").insert(withoutInbox).select("*").single();
  }
  if (result.error || !result.data) {
    return { ok: false, error: result.error?.message ?? "Aanmaken mislukt." };
  }

  await syncNoteFile(toNote(result.data), null);
  await supabase.from("tasks").delete().eq("id", id);
  revalidateInbox();
  return { ok: true };
}

// Zet een notitie om naar een taak (inhoud verhuist; de notitie verdwijnt,
// incl. het vault-bestand).
export async function convertNoteToTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: note, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !note) {
    return { ok: false, error: error?.message ?? "Notitie niet gevonden." };
  }

  const row = {
    title: ((note.title as string) || "Naamloos").slice(0, 200),
    notes: (note.body as string) || "",
    category: (note.category as string | null) ?? null,
    inbox: true,
  };
  let { error: taskErr } = await supabase.from("tasks").insert(row);
  if (taskErr && isMissingColumn(taskErr)) {
    // Vóór migraties 0011/0020: zonder categorie/inbox proberen.
    ({ error: taskErr } = await supabase
      .from("tasks")
      .insert({ title: row.title, notes: row.notes }));
  }
  if (taskErr) return { ok: false, error: taskErr.message };

  await supabase.from("notes").delete().eq("id", id);
  await removeNoteFile(
    noteFilePath(
      note.title as string,
      note.id as string,
      (note.category as string | null) ?? null,
    ),
  );
  revalidateInbox();
  return { ok: true };
}
