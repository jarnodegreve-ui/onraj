import JSZip from "jszip";

import { currentDayKey } from "@/lib/agenda";
import { listTasks } from "@/lib/data/tasks";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { priorityMeta } from "@/lib/tasks";
import type { Task } from "@/lib/types";

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100) || "taak"
  );
}

// Obsidian-vriendelijke markdown met YAML-frontmatter.
function toMarkdown(task: Task): string {
  const lines = [
    "---",
    `title: ${JSON.stringify(task.title)}`,
    `status: ${task.done ? "afgewerkt" : "open"}`,
    `prioriteit: ${priorityMeta(task.priority).label.toLowerCase()}`,
  ];
  if (task.dueOn) lines.push(`deadline: ${task.dueOn}`);
  lines.push(`created: ${task.createdAt.slice(0, 10)}`);
  lines.push(`updated: ${task.updatedAt.slice(0, 10)}`);
  lines.push("---", "");
  lines.push(`- [${task.done ? "x" : " "}] ${task.title}`);
  // Subtaken als geneste checklist — Obsidian rendert dit als afvinkbare lijst.
  for (const subtask of task.subtasks) {
    lines.push(`    - [${subtask.done ? "x" : " "}] ${subtask.title}`);
  }
  lines.push("");
  if (task.notes) lines.push(task.notes, "");
  return lines.join("\n");
}

/** Exporteert alle taken als ZIP met één .md-bestand per taak. */
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

  const tasks = await listTasks();
  const zip = new JSZip();
  const used = new Set<string>();

  for (const task of tasks) {
    const base = sanitizeFilename(task.title);
    let name = `${base}.md`;
    let counter = 2;
    while (used.has(name.toLowerCase())) {
      name = `${base} (${counter++}).md`;
    }
    used.add(name.toLowerCase());
    zip.file(name, toMarkdown(task));
  }

  const archive = await zip.generateAsync({ type: "arraybuffer" });
  const filename = `onraj-taken-${currentDayKey()}.zip`;

  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
