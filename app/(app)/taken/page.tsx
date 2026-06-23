import { TasksView } from "@/components/tasks/tasks-view";
import { currentDayKey } from "@/lib/agenda";
import { listCategories } from "@/lib/data/categories";
import {
  ensureRecurringTasks,
  listRecurringTasks,
} from "@/lib/data/recurring-tasks";
import { listTasks } from "@/lib/data/tasks";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function TakenPage() {
  if (!supabaseConfigured) {
    return (
      <TasksView
        tasks={[]}
        categories={[]}
        recurringTasks={[]}
        todayKey={currentDayKey()}
        preview
      />
    );
  }

  // Genereer ontbrekende terugkerende taken (idempotent) — mag de pagina nooit breken.
  try {
    await ensureRecurringTasks();
  } catch {
    /* stil falen */
  }

  const [tasks, categories, recurringTasks] = await Promise.all([
    listTasks(),
    listCategories("task"),
    listRecurringTasks(),
  ]);

  return (
    <TasksView
      tasks={tasks}
      categories={categories}
      recurringTasks={recurringTasks}
      todayKey={currentDayKey()}
      preview={false}
    />
  );
}
