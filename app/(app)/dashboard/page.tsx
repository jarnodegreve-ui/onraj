import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ListTodo,
  TrendingDown,
  Wallet,
} from "lucide-react";

import { RecentNotes } from "@/components/dashboard/recent-notes";
import { DashboardTasks } from "@/components/dashboard/tasks-list";
import { DashboardUpcoming } from "@/components/dashboard/upcoming-list";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentDayKey, upcomingEvents } from "@/lib/agenda";
import { listEvents } from "@/lib/data/events";
import { listNotes } from "@/lib/data/notes";
import { listTasks } from "@/lib/data/tasks";
import { listTransactions } from "@/lib/data/transactions";
import { currentMonthKey, summariseMonth } from "@/lib/finance";
import { displayName, formatEuro, greetingForTimeZone } from "@/lib/format";
import { navItems } from "@/lib/nav";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const MODULE_BESCHRIJVING: Record<string, string> = {
  "/taken": "Je to-do's met deadlines.",
  "/notities": "Markdown-notities met tags en zoeken.",
  "/financien": "Inkomsten, uitgaven en maandoverzicht.",
  "/agenda": "Je afspraken en komende activiteiten.",
};

export default async function DashboardPage() {
  if (!supabaseConfigured) {
    return <PreviewDashboard />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [notes, transactions, events, tasks] = await Promise.all([
    listNotes(),
    listTransactions(),
    listEvents(),
    listTasks(),
  ]);

  const name = displayName(user?.email);
  const todayKey = currentDayKey();
  const summary = summariseMonth(transactions, currentMonthKey());
  const upcoming = upcomingEvents(events, new Date(), 5);
  const openTasks = tasks.filter((task) => !task.done);

  return (
    <div className="space-y-8">
      <Greeting name={name} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo deze maand"
          value={formatEuro(summary.saldo)}
          icon={Wallet}
          valueClassName={
            summary.saldo < 0 ? "text-rose-600 dark:text-rose-400" : undefined
          }
        />
        <StatCard
          label="Uitgaven deze maand"
          value={formatEuro(summary.uitgaven)}
          icon={TrendingDown}
        />
        <StatCard label="Open taken" value={openTasks.length} icon={ListTodo} />
        <StatCard
          label="Komende afspraken"
          value={upcoming.length}
          icon={CalendarDays}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardTasks tasks={openTasks.slice(0, 5)} todayKey={todayKey} />
        <RecentNotes notes={notes.slice(0, 4)} />
        <DashboardUpcoming events={upcoming} />
      </div>
    </div>
  );
}

function Greeting({ name }: { name: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-semibold tracking-tight">
        {greetingForTimeZone()}, {name}
      </h2>
      <p className="text-sm text-muted-foreground">
        Hier is je overzicht voor vandaag.
      </p>
    </div>
  );
}

function PreviewDashboard() {
  const modules = navItems.filter((item) => item.href !== "/dashboard");
  return (
    <div className="space-y-8">
      <Greeting name="Jarno" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="size-5" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {item.title}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
                <CardDescription>
                  {MODULE_BESCHRIJVING[item.href]}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
