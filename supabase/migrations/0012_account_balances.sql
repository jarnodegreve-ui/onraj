-- ONRAJ — migratie 0012
-- Rekeningstanden per maand (net-worth-tracking, zoals de spreadsheet).

begin;

create table if not exists public.account_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  account text not null,
  month date not null, -- eerste van de maand
  amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account, month)
);

alter table public.account_balances enable row level security;

drop policy if exists "ab_select_own" on public.account_balances;
create policy "ab_select_own" on public.account_balances
  for select using (auth.uid() = user_id);

drop policy if exists "ab_insert_own" on public.account_balances;
create policy "ab_insert_own" on public.account_balances
  for insert with check (auth.uid() = user_id);

drop policy if exists "ab_update_own" on public.account_balances;
create policy "ab_update_own" on public.account_balances
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ab_delete_own" on public.account_balances;
create policy "ab_delete_own" on public.account_balances
  for delete using (auth.uid() = user_id);

create index if not exists account_balances_user_idx
  on public.account_balances(user_id, month);

commit;
