import { vaultDir } from "./github";
import type { Note } from "./types";

// Titel/categorie → veilige, leesbare bestands-/mapnaam. Obsidian ondersteunt
// spaties én hoofdletters prima; enkel padgevaarlijke tekens halen we weg.
function safeName(value: string): string {
  return value
    .replace(/[/\\:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 100)
    .trim();
}

// Categorie → submap (met sluitende slash) of "" voor de root van de vault-map.
function categoryFolder(category: string | null): string {
  if (!category) return "";
  const safe = safeName(category);
  return safe ? `${safe}/` : "";
}

export function noteFilePath(
  title: string,
  id: string,
  category: string | null,
): string {
  const base = safeName(title) || `Notitie ${id.slice(0, 6)}`;
  return `${vaultDir}/${categoryFolder(category)}${base}.md`;
}

// YAML-veilige string (dubbele aanhalingstekens, escaping ~ JSON).
function yaml(value: string): string {
  return JSON.stringify(value);
}

// Notitie → markdown met YAML-frontmatter die Obsidian begrijpt
// (tags worden Obsidian-tags; category + onraj_id voor sortering/sync).
export function noteToMarkdown(note: Note): string {
  const lines = ["---", `onraj_id: ${note.id}`];
  if (note.title) lines.push(`title: ${yaml(note.title)}`);
  if (note.category) lines.push(`category: ${yaml(note.category)}`);
  if (note.tags.length > 0) {
    lines.push(`tags: [${note.tags.map(yaml).join(", ")}]`);
  }
  lines.push(`pinned: ${note.pinned}`);
  if (note.archived) lines.push("archived: true");
  lines.push(`created: ${note.createdAt}`);
  lines.push(`updated: ${note.updatedAt}`);
  lines.push("---", "");
  return `${lines.join("\n")}\n${note.body}\n`;
}
