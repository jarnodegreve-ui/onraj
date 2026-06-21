import { vaultDir } from "./github";
import type { Note } from "./types";

// Titel → veilige, leesbare bestandsnaam. Obsidian ondersteunt spaties én
// hoofdletters prima in bestandsnamen, dus die behouden we; enkel tekens die
// problemen geven in bestandspaden/git halen we weg.
function safeFileName(title: string): string {
  return title
    .replace(/[/\\:*?"<>|]/g, " ") // verboden/risicovolle padtekens → spatie
    .replace(/\s+/g, " ") // witruimte normaliseren
    .replace(/^[.\s]+|[.\s]+$/g, "") // leidende/sluitende punten en spaties weg
    .slice(0, 100)
    .trim();
}

export function noteFilePath(title: string, id: string): string {
  const base = safeFileName(title) || `Notitie ${id.slice(0, 6)}`;
  return `${vaultDir}/${base}.md`;
}

// YAML-veilige string (dubbele aanhalingstekens, escaping ~ JSON).
function yaml(value: string): string {
  return JSON.stringify(value);
}

// Notitie → markdown met YAML-frontmatter die Obsidian begrijpt
// (tags worden Obsidian-tags; onraj_id maakt latere twee-weg-sync mogelijk).
export function noteToMarkdown(note: Note): string {
  const lines = ["---", `onraj_id: ${note.id}`];
  if (note.title) lines.push(`title: ${yaml(note.title)}`);
  if (note.tags.length > 0) {
    lines.push(`tags: [${note.tags.map(yaml).join(", ")}]`);
  }
  lines.push(`pinned: ${note.pinned}`);
  lines.push(`created: ${note.createdAt}`);
  lines.push(`updated: ${note.updatedAt}`);
  lines.push("---", "");
  return `${lines.join("\n")}\n${note.body}\n`;
}
