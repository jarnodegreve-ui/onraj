import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ListTodo,
  NotebookPen,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { AccountsChart } from "@/components/dashboard/accounts-chart";
import { RecentNotes } from "@/components/dashboard/recent-notes";
import { DashboardTasks } from "@/components/dashboard/tasks-list";
import { DashboardUpcoming } from "@/components/dashboard/upcoming-list";
import { WeekStrip } from "@/components/dashboard/week-strip";
import { PushToggle } from "@/components/push/push-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentDayKey, eventDayKey, upcomingEvents } from "@/lib/agenda";
import { latestPerAccount, listAccountBalances } from "@/lib/data/accounts";
import { listEvents } from "@/lib/data/events";
import { listNotes } from "@/lib/data/notes";
import { listTasks } from "@/lib/data/tasks";
import { listTransactions } from "@/lib/data/transactions";
import { currentMonthKey, summariseMonth } from "@/lib/finance";
import { displayName, formatDate, formatEuro } from "@/lib/format";
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

  const [notes, transactions, events, tasks, accountBalances] =
    await Promise.all([
      listNotes(),
      listTransactions(),
      listEvents(),
      listTasks(),
      listAccountBalances(),
    ]);

  const name = displayName(user?.email);
  const todayKey = currentDayKey();
  const summary = summariseMonth(transactions, currentMonthKey());
  const upcoming = upcomingEvents(events, new Date(), 5);
  const openTasks = tasks.filter((task) => !task.done);
  const eventsToday = events.filter(
    (event) => eventDayKey(event) === todayKey,
  ).length;

  const accountChart = latestPerAccount(accountBalances).map((balance) => ({
    account: balance.account,
    amount: balance.amount,
  }));

  const cards = [
    {
      href: "/taken",
      icon: ListTodo,
      title: "Taken",
      value: openTasks.length,
      sublabel: "openstaand",
      accent: "#f59e0b",
    },
    {
      href: "/notities",
      icon: NotebookPen,
      title: "Notities",
      value: notes.length,
      sublabel: "actieve notities",
      accent: "#2563eb",
    },
    {
      href: "/agenda",
      icon: CalendarDays,
      title: "Agenda",
      value: eventsToday,
      sublabel: "afspraken vandaag",
      accent: "#7c3aed",
    },
    {
      href: "/financien",
      icon: Wallet,
      title: "Financiën",
      value: formatEuro(summary.saldo),
      sublabel: "saldo deze maand",
      accent: "#22c55e",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <Greeting name={name} />
        <PushToggle />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <ModuleCard key={card.href} {...card} />
        ))}
      </div>

      <WeekStrip events={events} todayKey={todayKey} />

      {accountChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rekeningen</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountsChart data={accountChart} />
          </CardContent>
        </Card>
      )}

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
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        Welkom terug, {name}! <span aria-hidden>👋</span>
      </h2>
      <p className="text-sm text-muted-foreground first-letter:uppercase">
        {formatDate(currentDayKey(), "EEEE d MMMM")}
      </p>
    </div>
  );
}

function ModuleCard({
  href,
  icon: Icon,
  title,
  value,
  sublabel,
  accent,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  value: React.ReactNode;
  sublabel: string;
  accent: string;
}) {
  return (
    <Link href={href} className="group">
      <div
        data-slot="card"
        className="flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors group-hover:border-primary/30"
      >
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
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
                <div
                  className="mb-2 flex size-10 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${item.accent}1a`,
                    color: item.accent,
                  }}
                >
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
