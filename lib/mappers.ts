import type {
  AccountBalance,
  AccountBalanceRow,
  Budget,
  BudgetRow,
  CalendarEvent,
  Category,
  CategoryRow,
  EventRow,
  Holding,
  HoldingPrice,
  HoldingPriceRow,
  HoldingRow,
  Note,
  NoteRow,
  RecurringTask,
  RecurringTaskRow,
  RecurringTransaction,
  RecurringTransactionRow,
  SavingsGoal,
  SavingsGoalRow,
  Subtask,
  Task,
  TaskRow,
  Transaction,
  TransactionRow,
} from "./types";

function toNumber(value: number | string): number {
  return typeof value === "string" ? Number.parseFloat(value) : value;
}

// jsonb is vrij vormbaar — saneer elk subtaak-item tot {id, title, done}
// en gooi onbruikbare items weg, zodat de UI nooit op rommel struikelt.
function toSubtasks(value: unknown): Subtask[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): Subtask[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    const title = typeof item.title === "string" ? item.title : "";
    if (!id || !title.trim()) return [];
    return [{ id, title, done: item.done === true }];
  });
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    pinned: row.pinned,
    category: row.category ?? null,
    archived: row.archived ?? false,
    position: row.position ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    occurredOn: row.occurred_on,
    amount:
      typeof row.amount === "string"
        ? Number.parseFloat(row.amount)
        : row.amount,
    direction: row.direction,
    category: row.category,
    description: row.description,
    account: row.account,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCalendarEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    location: row.location,
    notes: row.notes,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: "local",
    htmlLink: null,
  };
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    dueOn: row.due_on,
    notes: row.notes,
    priority: row.priority ?? "middel",
    category: row.category ?? null,
    subtasks: toSubtasks(row.subtasks),
    position: row.position ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    category: row.category,
    amount: toNumber(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRecurringTransaction(
  row: RecurringTransactionRow,
): RecurringTransaction {
  return {
    id: row.id,
    amount: toNumber(row.amount),
    direction: row.direction,
    category: row.category,
    description: row.description,
    account: row.account,
    dayOfMonth: row.day_of_month,
    active: row.active,
    startMonth: row.start_month,
    endMonth: row.end_month ?? null,
    lastGeneratedMonth: row.last_generated_month,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRecurringTask(row: RecurringTaskRow): RecurringTask {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    priority: row.priority ?? "middel",
    category: row.category,
    frequency: row.frequency,
    weekday: row.weekday,
    dayOfMonth: row.day_of_month,
    active: row.active,
    startOn: row.start_on,
    lastGeneratedOn: row.last_generated_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSavingsGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: toNumber(row.target_amount),
    savedAmount: toNumber(row.saved_amount),
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    scope: row.scope,
    name: row.name,
    color: row.color,
    position: row.position ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAccountBalance(row: AccountBalanceRow): AccountBalance {
  return {
    id: row.id,
    account: row.account,
    month: row.month,
    amount: toNumber(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker,
    quantity: toNumber(row.quantity),
    costBasis: row.cost_basis === null ? null : toNumber(row.cost_basis),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toHoldingPrice(row: HoldingPriceRow): HoldingPrice {
  return {
    id: row.id,
    holdingId: row.holding_id,
    price: toNumber(row.price),
    recordedOn: row.recorded_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
