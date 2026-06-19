"use server";

import { listNotes } from "@/lib/data/notes";
import { githubConfigured, putFile } from "@/lib/github";
import { noteFilePath, noteToMarkdown } from "@/lib/vault";

export type VaultSyncResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

// Schrijft al je notities in één keer naar de vault-repo. Handig voor de
// eerste synchronisatie (notities die al bestonden vóór de koppeling).
export async function resyncVault(): Promise<VaultSyncResult> {
  if (!githubConfigured) {
    return { ok: false, error: "Obsidian/GitHub is nog niet gekoppeld." };
  }

  let notes;
  try {
    notes = await listNotes();
  } catch {
    return { ok: false, error: "Kon notities niet ophalen." };
  }

  let ok = 0;
  let lastError = "";
  for (const note of notes) {
    try {
      await putFile(
        noteFilePath(note.title, note.id),
        noteToMarkdown(note),
        `onraj: sync notitie "${note.title || "naamloos"}"`,
      );
      ok += 1;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "onbekende fout";
    }
  }

  if (ok === 0 && notes.length > 0) {
    return { ok: false, error: lastError || "Synchroniseren mislukt." };
  }
  return { ok: true, count: ok };
}
