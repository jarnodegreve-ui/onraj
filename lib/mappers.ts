import type {
  Budget,
  BudgetRow,
  CalendarEvent,
  EventRow,
  Note,
  NoteRow,
  RecurringTransaction,
  RecurringTransactionRow,
  Task,
  TaskRow,
  Transaction,
  TransactionRow,
} from "./types";

function toNumber(value: number | string): number {
  return typeof value === "string" ? Number.parseFloat(value) : value;
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    pinned: row.pinned,
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
  };
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    dueOn: row.due_on,
    notes: row.notes,
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
    lastGeneratedMonth: row.last_generated_month,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
