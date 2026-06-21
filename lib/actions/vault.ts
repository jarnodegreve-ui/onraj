"use server";

import { listNotes } from "@/lib/data/notes";
import {
  deleteFile,
  githubConfigured,
  listTreeFiles,
  putFile,
  vaultDir,
} from "@/lib/github";
import { noteFilePath, noteToMarkdown } from "@/lib/vault";

export type VaultSyncResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

// Schrijft al je notities naar de vault-repo en ruimt weesbestanden op (bv. oude
// geslugde namen na het hernoemen). Handig voor de eerste sync én voor migraties.
export async function resyncVault(): Promise<VaultSyncResult> {
  if (!githubConfigured) {
    return { ok: false, error: "Obsidian/GitHub is nog niet gekoppeld." };
  }

  let notes;
  try {
    // Ook gearchiveerde notities meenemen: hun vault-bestand blijft bewaard.
    notes = await listNotes(true);
  } catch {
    return { ok: false, error: "Kon notities niet ophalen." };
  }

  // Doelbestanden per notitie.
  const targets = new Map(
    notes.map((note) => [
      noteFilePath(note.title, note.id, note.category),
      note,
    ]),
  );

  // Weesbestanden opruimen: alles in de ONRAJ-map (incl. categorie-submappen)
  // dat geen huidige notitie meer is.
  try {
    const existing = await listTreeFiles(vaultDir);
    for (const path of existing) {
      if (path.endsWith(".md") && !targets.has(path)) {
        await deleteFile(path, "onraj: oude bestandsnaam opruimen");
      }
    }
  } catch (error) {
    console.error("[resync] opruimen mislukt:", error);
  }

  let ok = 0;
  let lastError = "";
  for (const [path, note] of targets) {
    try {
      await putFile(
        path,
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
