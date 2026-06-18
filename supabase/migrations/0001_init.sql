-- ONRAJ — basismigratie 0001
-- Tabellen voor de drie databronnen van het portaal: notes, transactions en
-- events. Single-user: elke rij hangt via user_id aan auth.users, en RLS zorgt
-- dat je uitsluitend je eigen data ziet. Kolommen in snake_case; de app-laag
-- werkt in camelCase (zie lib/mappers.ts). DDL is idempotent, zodat de
-- migratie veilig opnieuw gedraaid kan worden.

begin;

-- Generieke trigger-functie: houdt updated_at bij op elke wijziging.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Notities
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null default '',
  body text not null default '', -- markdown
  tags text[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_idx
  on public.notes (user_id, updated_at desc);
create index if not exists notes_tags_idx
  on public.notes using gin (tags);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;

drop policy if exists "notes_eigenaar" on public.notes;
create policy "notes_eigenaar"
  on public.notes
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Transacties (financiën)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  occurred_on date not null default current_date,
  amount numeric(12, 2) not null check (amount >= 0),
  direction text not null check (direction in ('inkomst', 'uitgave')),
  category text not null default '',
  description text not null default '',
  account text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_datum_idx
  on public.transactions (user_id, occurred_on desc);

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

alter table public.transactions enable row level security;

drop policy if exists "transactions_eigenaar" on public.transactions;
create policy "transactions_eigenaar"
  on public.transactions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Agenda (events)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  notes text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_einde_na_start
    check (ends_at is null or ends_at >= starts_at)
);

create index if not exists events_user_start_idx
  on public.events (user_id, starts_at);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists "events_eigenaar" on public.events;
create policy "events_eigenaar"
  on public.events
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
