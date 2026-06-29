"use client";

import { useMemo, useState } from "react";
import { Download, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";

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
import { StatCard } from "@/components/stat-card";
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
          description="Inkomsten, uitgaven en je maandoverzicht."
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
        description="Inkomsten, uitgaven en je maandoverzicht."
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Saldo"
          value={<CountUp value={summary.saldo} format="euro" />}
          icon={Wallet}
          hint={monthLabel(month)}
          valueClassName={
            summary.saldo < 0 ? "text-rose-600 dark:text-rose-400" : undefined
          }
        />
        <StatCard
          label="Inkomsten"
          value={<CountUp value={summary.inkomsten} format="euro" />}
          icon={TrendingUp}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Uitgaven"
          value={<CountUp value={summary.uitgaven} format="euro" />}
          icon={TrendingDown}
        />
      </div>

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
          <CardTitle className="text-base capitalize">
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
