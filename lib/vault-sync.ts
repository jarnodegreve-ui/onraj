import { deleteFile, githubConfigured, putFile } from "./github";
import type { Note } from "./types";
import { noteFilePath, noteToMarkdown } from "./vault";

// Schrijft (of hernoemt) het .md-bestand van een notitie naar de Git-vault.
// Best-effort: faalt nooit hard, zodat notitie-CRUD altijd blijft werken —
// ook als GitHub niet gekoppeld is of even onbereikbaar is.
export async function syncNoteFile(note: Note, oldPath: string | null) {
  if (!githubConfigured) return;
  const path = noteFilePath(note.title, note.id, note.category);
  try {
    if (oldPath && oldPath !== path) {
      await deleteFile(oldPath, `onraj: hernoem notitie → ${path}`);
    }
    await putFile(
      path,
      noteToMarkdown(note),
      `onraj: notitie "${note.title || "naamloos"}"`,
    );
  } catch (error) {
    console.error("[vault-sync] schrijven mislukt:", error);
  }
}

export async function removeNoteFile(path: string) {
  if (!githubConfigured) return;
  try {
    await deleteFile(path, `onraj: verwijder notitie ${path}`);
  } catch (error) {
    console.error("[vault-sync] verwijderen mislukt:", error);
  }
}
