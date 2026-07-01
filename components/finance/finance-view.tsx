"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Wallet } from "lucide-react";

import { CountUp } from "@/components/count-up";
import { EmptyState } from "@/components/empty-state";
import { BudgetsCard } from "@/components/finance/budgets-card";
import { FinanceCharts } from "@/components/finance/finance-charts";
import { RecurringCard } from "@/components/finance/recurring-card";
import { SavingsCard } from "@/components/finance/savings-card";
import { TransactionEditor } from "@/components/finance/transaction-editor";
import { TransactionList } from "@/components/finance/transaction-list";
import { MonthSelector } from "@/components/month-selector";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  currentMonthKey,
  expensesByCategory,
  monthKeyOf,
  monthLabel,
  monthlyTrend,
  summariseMonth,
} from "@/lib/finance";
import type {
  Budget,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// Eén cel van de maandstrip: klein label boven een mono-bedrag.
function MonthStat({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "truncate font-mono text-lg font-semibold tracking-tight tabular-nums",
          className,
        )}
      >
        {children}
      </p>
    </div>
  );
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function FinanceView({
  transactions,
  budgets,
  recurring,
  savings,
  initialMonth,
  preview,
}: {
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  savings: SavingsGoal[];
  initialMonth: string;
  preview: boolean;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const summary = useMemo(
    () => summariseMonth(transactions, month),
    [transactions, month],
  );
  const categories = useMemo(
    () => expensesByCategory(transactions, month),
    [transactions, month],
  );
  const trend = useMemo(
    () => monthlyTrend(transactions, month, 6),
    [transactions, month],
  );
  const monthTx = useMemo(
    () => transactions.filter((tx) => monthKeyOf(tx.occurredOn) === month),
    [transactions, month],
  );
  const allCategories = useMemo(
    () =>
      Array.from(
        new Set(transactions.map((tx) => tx.category.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "nl")),
    [transactions],
  );

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setEditorOpen(true);
  }

  if (preview) {
    return (
      <div>
        <PageHeader
          title="Financiën"
        >
          <Button disabled>
            <Plus className="size-4" /> Nieuwe transactie
          </Button>
        </PageHeader>
        <EmptyState
          icon={Wallet}
          title="Preview-modus"
          description="Koppel Supabase om je financiën bij te houden."
        />
      </div>
    );
  }

  const defaultDate = month === currentMonthKey() ? todayIso() : `${month}-01`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financiën"
      >
        <MonthSelector month={month} onChange={setMonth} />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline">
                <Download className="size-4" /> Exporteer
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              render={
                <a href={`/api/finance/export?scope=month&month=${month}`} />
              }
            >
              Deze maand (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <a
                  href={`/api/finance/export?scope=year&year=${month.slice(0, 4)}`}
                />
              }
            >
              Dit jaar (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem render={<a href="/api/finance/export?scope=all" />}>
              Alles (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Nieuwe transactie
        </Button>
      </PageHeader>

      {/* Maandstrip: in/uit/saldo op één dichte regel i.p.v. drie kaarten. */}
      <Card size="sm">
        <CardContent className="grid grid-cols-3 gap-2">
          <MonthStat label="Inkomsten" className="text-pos">
            <CountUp value={summary.inkomsten} format="euro" />
          </MonthStat>
          <MonthStat label="Uitgaven">
            <CountUp value={summary.uitgaven} format="euro" />
          </MonthStat>
          <MonthStat
            label={`Saldo · ${monthLabel(month)}`}
            className={summary.saldo < 0 ? "text-neg" : "text-pos"}
          >
            <CountUp value={summary.saldo} format="euro" />
          </MonthStat>
        </CardContent>
      </Card>

      <FinanceCharts categories={categories} trend={trend} />

      <BudgetsCard
        budgets={budgets}
        spentByCategory={categories}
        categories={allCategories}
      />

      <RecurringCard recurring={recurring} categories={allCategories} />

      <SavingsCard goals={savings} />

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">
            Transacties — {monthLabel(month)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList transactions={monthTx} onEdit={openEdit} />
        </CardContent>
      </Card>

      <TransactionEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        transaction={editing}
        defaultDate={defaultDate}
        categories={allCategories}
      />
    </div>
  );
}
