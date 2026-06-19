-- ONRAJ — migratie 0007
-- Handmatige volgorde (verslepen) voor taken en notities via een position-kolom.

begin;

alter table public.tasks
  add column if not exists position integer not null default 0;

alter table public.notes
  add column if not exists position integer not null default 0;

commit;
