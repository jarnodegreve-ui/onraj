-- ONRAJ — migratie 0013
-- App-instellingen per gebruiker, o.a. een (gehashte) pincode om de financiën
-- af te schermen.

begin;

create table if not exists public.app_settings (
  user_id uuid primary key default auth.uid()
    references auth.users(id) on delete cascade,
  finance_pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "settings_select_own" on public.app_settings;
create policy "settings_select_own" on public.app_settings
  for select using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.app_settings;
create policy "settings_insert_own" on public.app_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.app_settings;
create policy "settings_update_own" on public.app_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
