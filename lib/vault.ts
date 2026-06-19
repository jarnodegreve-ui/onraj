import { vaultDir } from "./github";
import type { Note } from "./types";

// Titel → veilige, Obsidian-vriendelijke bestandsnaam (diacritics weg, spaties
// naar streepjes). Lege/symbool-titels vallen terug op een id-suffix.
function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function noteFilePath(title: string, id: string): string {
  const base = slugify(title) || `notitie-${id.slice(0, 6)}`;
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
