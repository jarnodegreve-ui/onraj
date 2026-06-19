-- ONRAJ — migratie 0003
-- Spaardoelen: een doelbedrag per doel met een gespaard bedrag. Zelfde
-- conventies als eerdere migraties (RLS, set_updated_at()-trigger, idempotent).

begin;

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  saved_amount numeric(12, 2) not null default 0 check (saved_amount >= 0),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists savings_user_idx
  on public.savings_goals (user_id, created_at desc);

drop trigger if exists savings_set_updated_at on public.savings_goals;
create trigger savings_set_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

alter table public.savings_goals enable row level security;

drop policy if exists "savings_eigenaar" on public.savings_goals;
create policy "savings_eigenaar"
  on public.savings_goals
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
