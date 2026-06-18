import type {
  CalendarEvent,
  EventRow,
  Note,
  NoteRow,
  Transaction,
  TransactionRow,
} from "./types";

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
