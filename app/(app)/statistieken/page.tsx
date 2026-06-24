import Link from "next/link";
import {
  CalendarDays,
  ListTodo,
  Lock,
  NotebookPen,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { NetWorthChart } from "@/components/dashboard/networth-chart";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Breakdown } from "@/components/stats/breakdown";
import { MonthlyBars } from "@/components/stats/monthly-bars";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { currentDayKey } from "@/lib/agenda";
import {
  latestPerAccount,
  listAccountBalances,
  netWorthByMonth,
} from "@/lib/data/accounts";
import { listCategories } from "@/lib/data/categories";
import { listEvents } from "@/lib/data/events";
import { listNotes } from "@/lib/data/notes";
import { listTasks } from "@/lib/data/tasks";
import { listTransactions } from "@/lib/data/transactions";
import {
  currentMonthKey,
  expensesByCategory,
  summariseMonth,
} from "@/lib/finance";
import { isFinanceLocked } from "@/lib/finance-lock";
import { formatEuro } from "@/lib/format";
import { eventStats, noteStats, taskStats } from "@/lib/stats";
import { supabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Statistieken · ONRAJ" };

export default async function StatistiekenPage() {
  if (!supabaseConfigured) {
    return (
      <div>
        <PageHeader
          title="Statistieken"
          description="Inzicht in je taken, notities, agenda en financiën."
        />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Verbind Supabase om je statistieken te zien.
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayKey = currentDayKey();
  const monthKey = currentMonthKey();

  const financeLocked = await isFinanceLocked();
  const [tasks, allNotes, events, taskCategories, noteCategories] =
    await Promise.all([
      listTasks(),
      listNotes(true),
      listEvents(),
      listCategories("task"),
      listCategories("note"),
    ]);
  // Financiële data niet ophalen wanneer het slot dichtstaat.
  const [transactions, accountBalances] = financeLocked
    ? [[], []]
    : await Promise.all([listTransactions(), listAccountBalances()]);

  const tStats = taskStats(tasks, todayKey);
  const nStats = noteStats(allNotes);
  const eStats = eventStats(events, todayKey, monthKey);

  // Categoriekleuren toepassen op de verdeelstaafjes.
  const taskColor = new Map(taskCategories.map((c) => [c.name, c.color]));
  const noteColor = new Map(noteCategories.map((c) => [c.name, c.color]));
  const taskByCategory = tStats.byCategory.slice(0, 6).map((item) => ({
    ...item,
    color: taskColor.get(item.label) ?? undefined,
  }));
  const noteByCategory = nStats.byCategory.slice(0, 6).map((item) => ({
    ...item,
    color: noteColor.get(item.label) ?? undefined,
  }));

  const totalNetWorth = latestPerAccount(accountBalances).reduce(
    (sum, balance) => sum + balance.amount,
    0,
  );
  const finance = summariseMonth(transactions, monthKey);
  const topExpenses = expensesByCategory(transactions, monthKey)
    .slice(0, 6)
    .map((slice) => ({
      label: slice.category,
      value: slice.amount,
      color: "#e11d48",
    }));
  const networthData = netWorthByMonth(accountBalances);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Statistieken"
        description="Een blik op je taken, notities, agenda en financiën."
      />

      {/* Overzicht — kerncijfers per module */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ListTodo}
          label="Openstaande taken"
          value={tStats.open}
          hint={`${tStats.completion}% voltooid`}
        />
        <StatCard
          icon={NotebookPen}
          label="Actieve notities"
          value={nStats.active}
          hint={`${nStats.pinned} vastgemaakt`}
        />
        <StatCard
          icon={CalendarDays}
          label="Afspraken deze maand"
          value={eStats.thisMonth}
          hint={`${eStats.next7} komende 7 dagen`}
        />
        <StatCard
          icon={Wallet}
          label="Vermogen"
          value={financeLocked ? "•••" : formatEuro(totalNetWorth)}
          hint={financeLocked ? "vergrendeld" : "totaal saldo"}
        />
      </div>

      {/* Taken */}
      <SectionCard title="Taken" icon={ListTodo} accent="#14b8a6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Openstaand" value={tStats.open} />
          <MiniStat label="Voltooid" value={`${tStats.done}/${tStats.total}`} />
          <MiniStat
            label="Achterstallig"
            value={tStats.overdue}
            accent={tStats.overdue > 0 ? "#e11d48" : undefined}
          />
          <MiniStat label="Vandaag te doen" value={tStats.dueToday} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Voltooiing</span>
            <span className="font-medium tabular-nums">
              {tStats.completion}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-brand-gradient h-full rounded-full transition-all"
              style={{ width: `${tStats.completion}%` }}
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Block title="Openstaand per prioriteit">
            <Breakdown
              items={tStats.byPriority}
              emptyLabel="Geen openstaande taken"
            />
          </Block>
          <Block title="Openstaand per categorie">
            <Breakdown
              items={taskByCategory}
              emptyLabel="Geen openstaande taken"
            />
          </Block>
        </div>
      </SectionCard>

      {/* Notities */}
      <SectionCard title="Notities" icon={NotebookPen} accent="#3d5afe">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Actief" value={nStats.active} />
          <MiniStat label="Vastgemaakt" value={nStats.pinned} />
          <MiniStat label="Gearchiveerd" value={nStats.archived} />
          <MiniStat label="Categorieën" value={nStats.byCategory.length} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Block title="Per categorie">
            <Breakdown
              items={noteByCategory}
              emptyLabel="Nog geen notities"
            />
          </Block>
          <Block title="Aangemaakt per maand">
            <MonthlyBars
              data={nStats.perMonth}
              color="#3d5afe"
              noun={["notitie", "notities"]}
            />
          </Block>
        </div>

        {nStats.topTags.length > 0 && (
          <Block title="Populairste tags">
            <div className="flex flex-wrap gap-2">
              {nStats.topTags.map((tag) => (
                <Badge key={tag.label} variant="secondary" className="gap-1.5">
                  <Tag className="size-3" />
                  {tag.label}
                  <span className="tabular-nums opacity-60">{tag.value}</span>
                </Badge>
              ))}
            </div>
          </Block>
        )}
      </SectionCard>

      {/* Agenda */}
      <SectionCard title="Agenda" icon={CalendarDays} accent="#a855f7">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Vandaag" value={eStats.today} />
          <MiniStat label="Komende 7 dagen" value={eStats.next7} />
          <MiniStat label="Deze maand" value={eStats.thisMonth} />
          <MiniStat label="Totaal" value={eStats.total} />
        </div>
      </SectionCard>

      {/* Financiën — respecteert het pincode-slot */}
      <SectionCard
        title="Financiën"
        icon={Wallet}
        accent="#22c55e"
        action={
          financeLocked ? (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" />
              Vergrendeld
            </Badge>
          ) : undefined
        }
      >
        {financeLocked ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="size-5" />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              Je financiële cijfers zijn vergrendeld. Ontgrendel het financiële
              tabblad om je statistieken te zien.
            </p>
            <Link
              href="/financien"
              className="text-sm font-medium text-primary hover:underline"
            >
              Naar Financiën →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniStat
                label="Inkomsten (maand)"
                value={formatEuro(finance.inkomsten)}
                accent="#22c55e"
              />
              <MiniStat
                label="Uitgaven (maand)"
                value={formatEuro(finance.uitgaven)}
                accent="#e11d48"
              />
              <MiniStat
                label="Saldo (maand)"
                value={formatEuro(finance.saldo)}
                accent={finance.saldo >= 0 ? "#22c55e" : "#e11d48"}
              />
            </div>

            <Block title="Grootste uitgaven deze maand">
              <Breakdown
                items={topExpenses}
                formatValue={formatEuro}
                emptyLabel="Geen uitgaven deze maand"
              />
            </Block>

            {networthData.length > 1 && (
              <Block title="Vermogen over tijd">
                <NetWorthChart data={networthData} />
              </Block>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Presentatie-helpers ──────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  accent,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  accent: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 px-(--card-spacing)">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <h3 className="flex-1 font-heading text-base font-medium">{title}</h3>
        {action}
      </div>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/5">
      <p
        className="text-xl font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}
