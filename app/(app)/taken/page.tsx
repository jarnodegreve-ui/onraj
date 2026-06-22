import { TasksView } from "@/components/tasks/tasks-view";
import { currentDayKey } from "@/lib/agenda";
import { listCategories } from "@/lib/data/categories";
import { listTasks } from "@/lib/data/tasks";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function TakenPage() {
  if (!supabaseConfigured) {
    return (
      <TasksView
        tasks={[]}
        categories={[]}
        todayKey={currentDayKey()}
        preview
      />
    );
  }

  const [tasks, categories] = await Promise.all([
    listTasks(),
    listCategories("task"),
  ]);

  return (
    <TasksView
      tasks={tasks}
      categories={categories}
      todayKey={currentDayKey()}
      preview={false}
    />
  );
}
