-- ONRAJ — migratie 0010
-- Zachte verwijdering: notities worden gearchiveerd (verborgen in het portaal)
-- i.p.v. echt gewist. Het vault-bestand blijft bewaard.

begin;

alter table public.notes
  add column if not exists archived boolean not null default false;

create index if not exists notes_archived_idx
  on public.notes(user_id, archived);

commit;
