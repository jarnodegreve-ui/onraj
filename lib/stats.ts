// Pure statistiek-berekeningen over de reeds opgehaalde domeinobjecten.
// Geen database-toegang hier — de pagina haalt de data op en voedt deze functies.

import { currentMonthKey, monthKeyOf, monthLabel, shiftMonth } from "./month";
import type { Note, Task, TaskPriority } from "./types";

/** Eén regel in een verdelings-staafje (categorie, prioriteit, tag, …). */
export interface StatItem {
  label: string;
  value: number;
  color?: string;
}

/** Telling per maand voor de laatste `count` maanden t/m `endKey`. */
export interface MonthCount {
  key: string;
  label: string;
  count: number;
}

function countByMonth(
  isoDates: string[],
  endKey: string,
  count: number,
): MonthCount[] {
  const buckets = new Map<string, number>();
  for (const iso of isoDates) {
    const key = monthKeyOf(iso);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const out: MonthCount[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const key = shiftMonth(endKey, -i);
    out.push({ key, label: monthLabel(key, "MMM"), count: buckets.get(key) ?? 0 });
  }
  return out;
}

// ─── Taken ────────────────────────────────────────────────────────────────────

export interface TaskStats {
  total: number;
  done: number;
  open: number;
  completion: number; // 0–100, afgerond
  overdue: number;
  dueToday: number;
  byPriority: StatItem[];
  byCategory: StatItem[];
}

const PRIORITY_META: { key: TaskPriority; label: string; color: string }[] = [
  { key: "hoog", label: "Hoog", color: "#c0566b" },
  { key: "middel", label: "Middel", color: "#c98a3d" },
  { key: "laag", label: "Laag", color: "#6b7280" },
];

export function taskStats(tasks: Task[], todayKey: string): TaskStats {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  const openTasks = tasks.filter((task) => !task.done);

  const overdue = openTasks.filter(
    (task) => task.dueOn !== null && task.dueOn < todayKey,
  ).length;
  const dueToday = openTasks.filter((task) => task.dueOn === todayKey).length;

  const byPriority: StatItem[] = PRIORITY_META.map((meta) => ({
    label: meta.label,
    color: meta.color,
    value: openTasks.filter((task) => task.priority === meta.key).length,
  })).filter((item) => item.value > 0);

  const byCategory = groupCount(
    openTasks.map((task) => task.category?.trim() || "Zonder categorie"),
  );

  return {
    total,
    done,
    open: openTasks.length,
    completion: total ? Math.round((done / total) * 100) : 0,
    overdue,
    dueToday,
    byPriority,
    byCategory,
  };
}

// ─── Notities ───────────────────────────────────────────────────────────────

export interface NoteStats {
  active: number;
  archived: number;
  pinned: number;
  byCategory: StatItem[];
  topTags: StatItem[];
  perMonth: MonthCount[];
}

/** Verwacht álle notities (incl. gearchiveerde), zoals listNotes(true). */
export function noteStats(allNotes: Note[]): NoteStats {
  const active = allNotes.filter((note) => !note.archived);
  const archived = allNotes.length - active.length;

  const byCategory = groupCount(
    active.map((note) => note.category?.trim() || "Zonder categorie"),
  );

  const tags: string[] = [];
  for (const note of active) {
    for (const tag of note.tags) {
      const clean = tag.trim();
      if (clean) tags.push(clean);
    }
  }

  return {
    active: active.length,
    archived,
    pinned: active.filter((note) => note.pinned).length,
    byCategory,
    topTags: groupCount(tags).slice(0, 12),
    perMonth: countByMonth(
      active.map((note) => note.createdAt),
      currentMonthKey(),
      6,
    ),
  };
}

// ─── Helper ─────────────────────────────────────────────────────────────────

/** Telt voorkomens per label en sorteert aflopend op aantal. */
function groupCount(labels: string[]): StatItem[] {
  const map = new Map<string, number>();
  for (const label of labels) {
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
