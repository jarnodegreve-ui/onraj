// Domeintypes (camelCase) + de bijbehorende database-rijen (snake_case).
// De helpers in lib/mappers.ts vertalen tussen beide lagen.

export type TransactieRichting = "inkomst" | "uitgave";

export interface Note {
  id: string;
  title: string;
  body: string; // markdown
  tags: string[];
  pinned: boolean;
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
}

// ─── Database-rijen, zoals Supabase ze teruggeeft ───────────────────────────

export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[] | null;
  pinned: boolean;
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
