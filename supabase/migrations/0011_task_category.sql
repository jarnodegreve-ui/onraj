-- ONRAJ — migratie 0011
-- Eén categorie per taak (zelfde principe als bij notities).

begin;

alter table public.tasks add column if not exists category text;

create index if not exists tasks_category_idx
  on public.tasks(user_id, category);

commit;
