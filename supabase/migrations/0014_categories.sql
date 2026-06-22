-- ONRAJ — migratie 0014
-- Beheerbare categorieën voor taken en notities. Tot nu toe waren categorieën
-- vrije tekst per item; deze tabel geeft een centrale lijst die je kan
-- toevoegen/hernoemen/verwijderen, met een eigen kleur en handmatige volgorde.
-- 'scope' onderscheidt taak- van notitiecategorieën (aparte lijsten).

begin;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  scope text not null check (scope in ('task', 'note')),
  name text not null,
  color text, -- hex (#RRGGBB), optioneel
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_unieke_naam unique (user_id, scope, name)
);

create index if not exists categories_user_scope_idx
  on public.categories (user_id, scope, position);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

drop policy if exists "categories_eigenaar" on public.categories;
create policy "categories_eigenaar"
  on public.categories
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Seed: bestaande (in gebruik zijnde) categorieën overnemen, zodat de lijst
-- meteen gevuld is. Idempotent dankzij de unieke constraint.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.categories (user_id, scope, name, position)
select user_id,
       'task' as scope,
       category as name,
       (row_number() over (partition by user_id order by lower(category)) - 1)
         as position
from (
  select distinct user_id, btrim(category) as category
  from public.tasks
  where category is not null and btrim(category) <> ''
) t
on conflict (user_id, scope, name) do nothing;

insert into public.categories (user_id, scope, name, position)
select user_id,
       'note' as scope,
       category as name,
       (row_number() over (partition by user_id order by lower(category)) - 1)
         as position
from (
  select distinct user_id, btrim(category) as category
  from public.notes
  where category is not null and btrim(category) <> ''
) n
on conflict (user_id, scope, name) do nothing;

commit;
