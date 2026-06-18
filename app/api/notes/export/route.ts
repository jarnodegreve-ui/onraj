import JSZip from "jszip";

import { currentDayKey } from "@/lib/agenda";
import { listNotes } from "@/lib/data/notes";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/lib/types";

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100) || "naamloos"
  );
}

// Obsidian-vriendelijke markdown met YAML-frontmatter.
function toMarkdown(note: Note): string {
  const lines = ["---", `title: ${JSON.stringify(note.title || "Naamloos")}`];
  if (note.tags.length > 0) {
    lines.push(`tags: [${note.tags.map((tag) => JSON.stringify(tag)).join(", ")}]`);
  }
  lines.push(`created: ${note.createdAt.slice(0, 10)}`);
  lines.push(`updated: ${note.updatedAt.slice(0, 10)}`);
  lines.push("---", "", note.body, "");
  return lines.join("\n");
}

/** Exporteert alle notities als ZIP met één .md-bestand per notitie. */
export async function GET() {
  if (!supabaseConfigured) {
    return new Response("Supabase is niet geconfigureerd.", { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Niet aangemeld.", { status: 401 });
  }

  const notes = await listNotes();
  const zip = new JSZip();
  const used = new Set<string>();

  for (const note of notes) {
    const base = sanitizeFilename(note.title || "naamloos");
    let name = `${base}.md`;
    let counter = 2;
    while (used.has(name.toLowerCase())) {
      name = `${base} (${counter++}).md`;
    }
    used.add(name.toLowerCase());
    zip.file(name, toMarkdown(note));
  }

  const archive = await zip.generateAsync({ type: "arraybuffer" });
  const filename = `onraj-notities-${currentDayKey()}.zip`;

  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
