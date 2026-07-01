// Domeintypes (camelCase) + de bijbehorende database-rijen (snake_case).
// De helpers in lib/mappers.ts vertalen tussen beide lagen.

export type TransactieRichting = "inkomst" | "uitgave";

export interface Note {
  id: string;
  title: string;
  body: string; // markdown
  tags: string[];
  pinned: boolean;
  category: string | null;
  archived: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  occurredOn: string; // ISO-datum (YYYY-MM-DD)
  amount: number;
  direction: TransactieRichting;
  category: string;
  description: string;
  account: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  source: "local" | "google";
  htmlLink: string | null; // alleen voor Google-events
}

// ─── Database-rijen, zoals Supabase ze teruggeeft ───────────────────────────

export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[] | null;
  pinned: boolean;
  category: string | null;
  archived: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  occurred_on: string;
  amount: number | string; // numeric kan als string terugkomen
  direction: TransactieRichting;
  category: string;
  description: string;
  account: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  user_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Taken ──────────────────────────────────────────────────────────────────

export type TaskPriority = "laag" | "middel" | "hoog";

/** Eén afvinkbare deelstap binnen een taak (checklist-item). */
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  dueOn: string | null; // ISO-datum (YYYY-MM-DD)
  dueTime: string | null; // 'HH:mm' (Brusselse lokale tijd), optioneel
  notes: string | null;
  priority: TaskPriority;
  category: string | null;
  subtasks: Subtask[];
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  done: boolean;
  due_on: string | null;
  due_time: string | null;
  notes: string | null;
  priority: TaskPriority;
  category: string | null;
  subtasks: unknown; // jsonb — gesanitiseerd in de mapper
  position: number;
  created_at: string;
  updated_at: string;
}

// ─── Terugkerende taken ──────────────────────────────────────────────────────

export type RecurringFrequency = "dagelijks" | "wekelijks" | "maandelijks";

export interface RecurringTask {
  id: string;
  title: string;
  notes: string | null;
  priority: TaskPriority;
  category: string | null;
  frequency: RecurringFrequency;
  weekday: number | null; // 0=zondag … 6=zaterdag (voor wekelijks)
  dayOfMonth: number | null; // 1–28 (voor maandelijks)
  active: boolean;
  startOn: string; // 'YYYY-MM-DD'
  lastGeneratedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTaskRow {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  priority: TaskPriority;
  category: string | null;
  frequency: RecurringFrequency;
  weekday: number | null;
  day_of_month: number | null;
  active: boolean;
  start_on: string;
  last_generated_on: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Budgetten ──────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  category: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRow {
  id: string;
  user_id: string;
  category: string;
  amount: number | string;
  created_at: string;
  updated_at: string;
}

// ─── Terugkerende transacties ────────────────────────────────────────────────

export interface RecurringTransaction {
  id: string;
  amount: number;
  direction: TransactieRichting;
  category: string;
  description: string;
  account: string | null;
  dayOfMonth: number;
  active: boolean;
  startMonth: string; // 'YYYY-MM'
  endMonth: string | null; // 'YYYY-MM' — laatste maand, of null = doorlopend
  lastGeneratedMonth: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransactionRow {
  id: string;
  user_id: string;
  amount: number | string;
  direction: TransactieRichting;
  category: string;
  description: string;
  account: string | null;
  day_of_month: number;
  active: boolean;
  start_month: string;
  end_month?: string | null;
  last_generated_month: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Spaardoelen ─────────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoalRow {
  id: string;
  user_id: string;
  name: string;
  target_amount: number | string;
  saved_amount: number | string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Rekeningstanden ─────────────────────────────────────────────────────────

export interface AccountBalance {
  id: string;
  account: string;
  month: string; // 'YYYY-MM-DD' (eerste van de maand)
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalanceRow {
  id: string;
  user_id: string;
  account: string;
  month: string;
  amount: number | string;
  created_at: string;
  updated_at: string;
}

// ─── Beleggingen ─────────────────────────────────────────────────────────────

export interface Holding {
  id: string;
  name: string;
  ticker: string | null;
  quantity: number;
  costBasis: number | null; // totale inleg in € (optioneel, voor rendement)
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingRow {
  id: string;
  user_id: string;
  name: string;
  ticker: string | null;
  quantity: number | string;
  cost_basis: number | string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface HoldingPrice {
  id: string;
  holdingId: string;
  price: number;
  recordedOn: string; // 'YYYY-MM-DD'
  createdAt: string;
  updatedAt: string;
}

export interface HoldingPriceRow {
  id: string;
  user_id: string;
  holding_id: string;
  price: number | string;
  recorded_on: string;
  created_at: string;
  updated_at: string;
}

// ─── Abonnementen ────────────────────────────────────────────────────────────

export type SubscriptionCycle = "maandelijks" | "jaarlijks";

export interface Subscription {
  id: string;
  name: string;
  amount: number; // bedrag per cyclus
  cycle: SubscriptionCycle;
  category: string | null;
  nextRenewal: string | null; // 'YYYY-MM-DD'
  active: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  name: string;
  amount: number | string;
  cycle: SubscriptionCycle;
  category: string | null;
  next_renewal: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Categorieën (beheerbaar) ────────────────────────────────────────────────

export type CategoryScope = "task" | "note";

export interface Category {
  id: string;
  scope: CategoryScope;
  name: string;
  color: string | null; // hex (#RRGGBB) of null
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRow {
  id: string;
  user_id: string;
  scope: CategoryScope;
  name: string;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

// ─── Bijlagen ────────────────────────────────────────────────────────────────

export type AttachmentEntity = "note" | "transaction" | "task";

/** Bijlage zoals getoond in de client — met een tijdelijke (signed) URL. */
export interface AttachmentView {
  id: string;
  name: string;
  mime: string | null;
  size: number | null;
  url: string;
}
