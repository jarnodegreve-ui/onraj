-- ONRAJ — migratie 0009
-- Eén categorie per notitie (los van de meervoudige tags). In de vault komt de
-- notitie in een submap per categorie.

begin;

alter table public.notes add column if not exists category text;

create index if not exists notes_category_idx
  on public.notes(user_id, category);

commit;
