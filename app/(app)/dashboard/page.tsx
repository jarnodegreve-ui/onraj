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

import { AccountsChart } from "@/components/dashboard/accounts-chart";
import { NetWorthChart } from "@/components/dashboard/networth-chart";
import { RecentNotes } from "@/components/dashboard/recent-notes";
import { DashboardTasks } from "@/components/dashboard/tasks-list";
import { TodayTimeline } from "@/components/dashboard/today-timeline";
import { DashboardUpcoming } from "@/components/dashboard/upcoming-list";
import { PushToggle } from "@/components/push/push-toggle";
import { TerminalCursor } from "@/components/terminal-cursor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentDayKey, eventDayKey, upcomingEvents } from "@/lib/agenda";
import {
  latestPerAccount,
  listAccountBalances,
  netWorthByMonth,
} from "@/lib/data/accounts";
import { listEvents } from "@/lib/data/events";
import { listNotes } from "@/lib/data/notes";
import { listTasks } from "@/lib/data/tasks";
import { listTransactions } from "@/lib/data/transactions";
import { currentMonthKey, summariseMonth } from "@/lib/finance";
import { isFinanceLocked } from "@/lib/finance-lock";
import { displayName, formatDate, formatEuro } from "@/lib/format";
import { navItems } from "@/lib/nav";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const MODULE_BESCHRIJVING: Record<string, string> = {
  "/inbox": "Snelle captures om te triëren.",
  "/taken": "Je to-do's met deadlines.",
  "/notities": "Markdown-notities met tags en zoeken.",
  "/financien": "Inkomsten, uitgaven en maandoverzicht.",
  "/agenda": "Je afspraken en komende activiteiten.",
  "/statistieken": "Cijfers en trends over al je modules.",
};

export default async function DashboardPage() {
  if (!supabaseConfigured) {
    return <PreviewDashboard />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const financeLocked = await isFinanceLocked();
  const [notes, events, tasks] = await Promise.all([
    listNotes(),
    listEvents(),
    listTasks(),
  ]);
  // Financiële data niet ophalen wanneer het slot dichtstaat (privacy + minder werk).
  const [transactions, accountBalances] = financeLocked
    ? [[], []]
    : await Promise.all([listTransactions(), listAccountBalances()]);

  const name = displayName(user?.email);
  const todayKey = currentDayKey();
  const summary = summariseMonth(transactions, currentMonthKey());
  const upcoming = upcomingEvents(events, new Date(), 5);
  const openTasks = tasks.filter((task) => !task.done);
  const eventsToday = events
    .filter((event) => eventDayKey(event) === todayKey)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  // Taken voor vandaag: vandaag te doen of al te laat, hoogste prioriteit eerst.
  const tasksToday = openTasks
    .filter((task) => task.dueOn !== null && task.dueOn <= todayKey)
    .sort((a, b) => {
      const due = (a.dueOn ?? "").localeCompare(b.dueOn ?? "");
      return due !== 0 ? due : a.title.localeCompare(b.title, "nl");
    });

  const accountChart = latestPerAccount(accountBalances).map((balance) => ({
    account: balance.account,
    amount: balance.amount,
  }));
  const networthData = netWorthByMonth(accountBalances);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <Greeting name={name} />
        <PushToggle />
      </div>

      {/* Bento — bovenste band: 'Vandaag' als blikvanger + een rail met saldo en tegels.
          Geen items-start: 'Vandaag' vult de rijhoogte zodat een lege dag geen gat laat. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayTimeline
            events={eventsToday}
            tasks={tasksToday}
            todayKey={todayKey}
            className="h-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Mobiel: tegels boven het saldo (duidelijker); desktop: saldo bovenaan de rail. */}
          <SaldoCard
            className="order-2 col-span-2 lg:order-1"
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
            accent="#f59e0b"
            className="order-1 lg:order-2"
          />
          <StatTile
            href="/notities"
            icon={NotebookPen}
            label="Notities"
            value={notes.length}
            accent="#c2f04d"
            className="order-1 lg:order-2"
          />
        </div>
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
        <span className="text-primary" aria-hidden>
          ❯
        </span>
        welkom terug, {name}
        <TerminalCursor className="h-[0.9em] w-[0.5ch]" />
      </h2>
      <p className="font-mono text-xs tracking-wide text-muted-foreground first-letter:uppercase">
        {formatDate(currentDayKey(), "EEEE d MMMM")}
      </p>
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
        className="h-full rounded-xl border bg-card p-5 transition-colors group-hover:border-primary/30"
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
              {formatEuro(saldo)}
            </p>
            <div className="mt-3 flex items-center gap-4 font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3.5 text-emerald-500" />
                {formatEuro(inkomsten)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="size-3.5 text-rose-500" />
                {formatEuro(uitgaven)}
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
        className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors group-hover:border-primary/30"
      >
        <div
          className="flex size-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
          {value}
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
