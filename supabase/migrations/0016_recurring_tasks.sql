-- ONRAJ — migratie 0016
-- Terugkerende taken: sjablonen die automatisch taken genereren (dagelijks,
-- wekelijks op een weekdag, of maandelijks op een dag). Analoog aan de
-- terugkerende transacties (0002). Single-user via user_id + auth.uid(), RLS aan.

begin;

create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  priority text not null default 'middel'
    check (priority in ('laag', 'middel', 'hoog')),
  category text,
  frequency text not null
    check (frequency in ('dagelijks', 'wekelijks', 'maandelijks')),
  weekday int check (weekday between 0 and 6),       -- 0=zondag … 6=zaterdag (voor wekelijks)
  day_of_month int check (day_of_month between 1 and 28), -- voor maandelijks
  active boolean not null default true,
  start_on date not null default current_date,
  last_generated_on date,                            -- laatste dag t/m gegenereerd
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_tasks_user_idx
  on public.recurring_tasks (user_id);

drop trigger if exists recurring_tasks_set_updated_at on public.recurring_tasks;
create trigger recurring_tasks_set_updated_at
  before update on public.recurring_tasks
  for each row execute function public.set_updated_at();

alter table public.recurring_tasks enable row level security;

drop policy if exists "recurring_tasks_eigenaar" on public.recurring_tasks;
create policy "recurring_tasks_eigenaar"
  on public.recurring_tasks
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
