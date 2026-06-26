import type { TaskPriority } from "./types";

export interface PriorityMeta {
  value: TaskPriority;
  label: string;
  color: string;
  order: number;
}

// Hoog eerst (order 0) bij sorteren op prioriteit.
export const TASK_PRIORITIES: PriorityMeta[] = [
  { value: "hoog", label: "Hoog", color: "#c0566b", order: 0 },
  { value: "middel", label: "Middel", color: "#c98a3d", order: 1 },
  { value: "laag", label: "Laag", color: "#6b7280", order: 2 },
];

export function priorityMeta(priority: TaskPriority): PriorityMeta {
  return (
    TASK_PRIORITIES.find((item) => item.value === priority) ??
    TASK_PRIORITIES[1]
  );
}
