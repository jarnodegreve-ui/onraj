export interface ParsedNote {
  onrajId: string | null;
  title: string;
  category: string | null;
  tags: string[];
  pinned: boolean;
  body: string;
}

function fmValue(frontmatter: string, key: string): string | null {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : null;
}

// Waarde is met JSON.stringify weggeschreven (zie lib/vault.ts) → terug parsen.
function jsonString(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value === "string" ? value : raw;
  } catch {
    return raw;
  }
}

// Parseert een ONRAJ-notitiebestand (frontmatter + body) terug naar velden.
export function parseNoteMarkdown(content: string): ParsedNote {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const frontmatter = match ? match[1] : "";
  let body = match ? match[2] : content;
  body = body.replace(/^\r?\n+/, "").replace(/\s+$/, "");

  const onrajId = fmValue(frontmatter, "onraj_id");
  const title = jsonString(fmValue(frontmatter, "title")) ?? "";
  const category = jsonString(fmValue(frontmatter, "category"));
  const pinned = fmValue(frontmatter, "pinned") === "true";

  let tags: string[] = [];
  const tagsRaw = fmValue(frontmatter, "tags");
  if (tagsRaw) {
    try {
      const parsed = JSON.parse(tagsRaw);
      if (Array.isArray(parsed)) tags = parsed.map((tag) => String(tag));
    } catch {
      // ongeldige tags negeren
    }
  }

  return { onrajId, title, category, tags, pinned, body };
}
