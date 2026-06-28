import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  ListTodo,
  NotebookPen,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { CountUp } from "@/components/count-up";
import { AccountsChart } from "@/components/dashboard/accounts-chart";
import { Clock } from "@/components/dashboard/clock";
import { NetWorthChart } from "@/components/dashboard/networth-chart";
import { TaskTabs } from "@/components/dashboard/task-tabs";
import { RecentNotes } from "@/components/dashboard/recent-notes";
import { PushToggle } from "@/components/push/push-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  latestPerAccount,
  listAccountBalances,
  netWorthByMonth,
} from "@/lib/data/accounts";
import { listNotes } from "@/lib/data/notes";
import { listTasks } from "@/lib/data/tasks";
import { listTransactions } from "@/lib/data/transactions";
import { currentMonthKey, summariseMonth } from "@/lib/finance";
import { isFinanceLocked } from "@/lib/finance-lock";
import { navItems } from "@/lib/nav";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

// Groepeer openstaande taken per categorie (meeste eerst, "Overig" achteraan),
// elk gesorteerd op deadline → prioriteit → titel. Voor de veegbare tab-kaart.
const PRIO_RANK: Record<Task["priority"], number> = { hoog: 0, middel: 1, laag: 2 };

function buildTaskGroups(tasks: Task[]): { name: string; tasks: Task[] }[] {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.category || "Overig";
    const list = map.get(key);
    if (list) list.push(task);
    else map.set(key, [task]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      // 1. deadline — vroegste eerst, taken zonder deadline achteraan
      if (a.dueOn && b.dueOn && a.dueOn !== b.dueOn)
        return a.dueOn.localeCompare(b.dueOn);
      if (a.dueOn && !b.dueOn) return -1;
      if (!a.dueOn && b.dueOn) return 1;
      // 2. prioriteit — hoog eerst
      const prio = PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
      if (prio !== 0) return prio;
      // 3. titel
      return a.title.localeCompare(b.title, "nl");
    });
  }
  return [...map.entries()]
    .map(([name, tasks]) => ({ name, tasks }))
    .sort((a, b) => {
      if (a.name === "Overig") return 1;
      if (b.name === "Overig") return -1;
      return b.tasks.length - a.tasks.length;
    });
}

const MODULE_BESCHRIJVING: Record<string, string> = {
  "/inbox": "Snelle captures om te triëren.",
  "/taken": "Je to-do's met deadlines.",
  "/notities": "Markdown-notities met tags en zoeken.",
  "/financien": "Inkomsten, uitgaven en maandoverzicht.",
  "/statistieken": "Cijfers en trends over al je modules.",
};

export default async function DashboardPage() {
  if (!supabaseConfigured) {
    return <PreviewDashboard />;
  }

  const financeLocked = await isFinanceLocked();
  const [notes, tasks] = await Promise.all([listNotes(), listTasks()]);
  // Financiële data niet ophalen wanneer het slot dichtstaat (privacy + minder werk).
  const [transactions, accountBalances] = financeLocked
    ? [[], []]
    : await Promise.all([listTransactions(), listAccountBalances()]);

  const summary = summariseMonth(transactions, currentMonthKey());
  const openTasks = tasks.filter((task) => !task.done);
  const taskGroups = buildTaskGroups(openTasks);

  const accountChart = latestPerAccount(accountBalances).map((balance) => ({
    account: balance.account,
    amount: balance.amount,
  }));
  const networthData = netWorthByMonth(accountBalances);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <Clock />
        <PushToggle />
      </div>

      {/* Veegbare taken per categorie. */}
      {taskGroups.length > 0 && <TaskTabs groups={taskGroups} />}

      {/* Saldo deze maand + kerntegels. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SaldoCard
          className="sm:col-span-2"
          locked={financeLocked}
          inkomsten={summary.inkomsten}
          uitgaven={summary.uitgaven}
          saldo={summary.saldo}
        />
        <StatTile
          href="/taken"
          icon={ListTodo}
          label="Open taken"
          value={openTasks.length}
          accent="#c98a3d"
        />
        <StatTile
          href="/notities"
          icon={NotebookPen}
          label="Notities"
          value={notes.length}
          accent="#3d68be"
        />
      </div>

      {!financeLocked && accountChart.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rekeningen</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountsChart data={accountChart} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vermogen</CardTitle>
            </CardHeader>
            <CardContent>
              <NetWorthChart data={networthData} />
            </CardContent>
          </Card>
        </div>
      )}

      <RecentNotes notes={notes.slice(0, 4)} />
    </div>
  );
}

// Finance-snapshot in de rail: saldo van deze maand + mini inkomst/uitgave.
// Toont •••  wanneer het finance-slot dicht staat.
function SaldoCard({
  locked,
  inkomsten,
  uitgaven,
  saldo,
  className,
}: {
  locked: boolean;
  inkomsten: number;
  uitgaven: number;
  saldo: number;
  className?: string;
}) {
  return (
    <Link href="/financien" className={cn("group block", className)}>
      <div
        data-slot="card"
        className="h-full rounded-2xl border bg-card p-5 transition-colors group-hover:border-primary/30"
      >
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet className="size-4" /> Saldo deze maand
          </p>
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        {locked ? (
          <>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums">
              •••
            </p>
            <p className="text-xs text-muted-foreground">vergrendeld</p>
          </>
        ) : (
          <>
            <p
              className={cn(
                "mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums",
                saldo >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              <CountUp value={saldo} format="euro" />
            </p>
            <div className="mt-3 flex items-center gap-4 font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3.5 text-emerald-500" />
                <CountUp value={inkomsten} format="euro" />
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="size-3.5 text-rose-500" />
                <CountUp value={uitgaven} format="euro" />
              </span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

// Compacte tegel met een telling, linkt naar de module.
function StatTile({
  href,
  icon: Icon,
  label,
  value,
  accent,
  className,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number;
  accent: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group block", className)}>
      <div
        data-slot="card"
        className="flex h-full flex-col gap-2 rounded-2xl border bg-card p-4 transition-colors group-hover:border-primary/30"
      >
        <div
          className="flex size-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
          <CountUp value={value} format="integer" />
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

function PreviewDashboard() {
  const modules = navItems.filter((item) => item.href !== "/dashboard");
  return (
    <div className="space-y-8">
      <Clock />
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
