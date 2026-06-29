-- ONRAJ — migratie 0023
-- Abonnementen-overzicht: wat loopt er en wat kost het per maand/jaar.
-- Maandbedrag = bij 'jaarlijks' wordt amount/12 gerekend (in de app).

begin;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(10, 2) not null default 0, -- bedrag per cyclus in €
  cycle text not null default 'maandelijks'
    check (cycle in ('maandelijks', 'jaarlijks')),
  category text,
  next_renewal date, -- optionele volgende vervaldatum
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "subs_insert_own" on public.subscriptions;
create policy "subs_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "subs_update_own" on public.subscriptions;
create policy "subs_update_own" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "subs_delete_own" on public.subscriptions;
create policy "subs_delete_own" on public.subscriptions
  for delete using (auth.uid() = user_id);

create index if not exists subscriptions_user_idx
  on public.subscriptions(user_id);

commit;
