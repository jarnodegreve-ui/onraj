import { TasksView } from "@/components/tasks/tasks-view";
import { currentDayKey } from "@/lib/agenda";
import { listTasks } from "@/lib/data/tasks";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function TakenPage() {
  const tasks = supabaseConfigured ? await listTasks() : [];
  return (
    <TasksView
      tasks={tasks}
      todayKey={currentDayKey()}
      preview={!supabaseConfigured}
    />
  );
}
