-- ONRAJ — migratie 0002
-- Extra tabellen: budgetten per categorie, terugkerende transactie-sjablonen
-- en taken (to-do's). Zelfde conventies als 0001: single-user via user_id +
-- auth.uid(), RLS aan, set_updated_at()-trigger, idempotente DDL.

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- Budgetten — maandbudget per categorie (geldt voor elke maand)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

alter table public.budgets enable row level security;

drop policy if exists "budgets_eigenaar" on public.budgets;
create policy "budgets_eigenaar"
  on public.budgets
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Terugkerende transacties — sjablonen die maandelijks een transactie maken
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  direction text not null check (direction in ('inkomst', 'uitgave')),
  category text not null default '',
  description text not null default '',
  account text,
  day_of_month int not null default 1 check (day_of_month between 1 and 28),
  active boolean not null default true,
  start_month text not null,            -- 'YYYY-MM'
  last_generated_month text,            -- 'YYYY-MM' of null
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_user_idx
  on public.recurring_transactions (user_id);

drop trigger if exists recurring_set_updated_at on public.recurring_transactions;
create trigger recurring_set_updated_at
  before update on public.recurring_transactions
  for each row execute function public.set_updated_at();

alter table public.recurring_transactions enable row level security;

drop policy if exists "recurring_eigenaar" on public.recurring_transactions;
create policy "recurring_eigenaar"
  on public.recurring_transactions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Taken (to-do's)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  due_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_idx
  on public.tasks (user_id, done, due_on);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

drop policy if exists "tasks_eigenaar" on public.tasks;
create policy "tasks_eigenaar"
  on public.tasks
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
