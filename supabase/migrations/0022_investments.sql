-- ONRAJ — migratie 0022
-- Beleggingen: posities (aandelen/ETF's) + wekelijkse koerssnapshots.
-- Waarde = aantal × laatste koers; rendement = waarde − inleg (cost_basis).

begin;

-- ── Posities ────────────────────────────────────────────────────────────────
create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null,
  ticker text,
  quantity numeric(18, 6) not null default 0, -- aantal stuks (fracties mogelijk)
  cost_basis numeric(14, 2), -- totale inleg in € (optioneel, voor rendement)
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.holdings enable row level security;

drop policy if exists "holdings_select_own" on public.holdings;
create policy "holdings_select_own" on public.holdings
  for select using (auth.uid() = user_id);

drop policy if exists "holdings_insert_own" on public.holdings;
create policy "holdings_insert_own" on public.holdings
  for insert with check (auth.uid() = user_id);

drop policy if exists "holdings_update_own" on public.holdings;
create policy "holdings_update_own" on public.holdings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "holdings_delete_own" on public.holdings;
create policy "holdings_delete_own" on public.holdings
  for delete using (auth.uid() = user_id);

create index if not exists holdings_user_idx
  on public.holdings(user_id);

-- ── Koerssnapshots (één per positie per dag; wekelijks ingevoerd) ─────────────
create table if not exists public.holding_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  holding_id uuid not null
    references public.holdings(id) on delete cascade,
  price numeric(14, 4) not null, -- koers per stuk in €
  recorded_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, holding_id, recorded_on)
);

alter table public.holding_prices enable row level security;

drop policy if exists "hp_select_own" on public.holding_prices;
create policy "hp_select_own" on public.holding_prices
  for select using (auth.uid() = user_id);

drop policy if exists "hp_insert_own" on public.holding_prices;
create policy "hp_insert_own" on public.holding_prices
  for insert with check (auth.uid() = user_id);

drop policy if exists "hp_update_own" on public.holding_prices;
create policy "hp_update_own" on public.holding_prices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "hp_delete_own" on public.holding_prices;
create policy "hp_delete_own" on public.holding_prices
  for delete using (auth.uid() = user_id);

create index if not exists holding_prices_holding_idx
  on public.holding_prices(user_id, holding_id, recorded_on);

commit;
