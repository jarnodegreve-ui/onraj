-- Prullenbak: soft-delete via deleted_at. NULL = actief, een timestamp = in de
-- prullenbak. Een wekelijkse opschoning (cron) verwijdert rijen die langer dan
-- 30 dagen in de prullenbak zitten definitief.
--
-- Idempotent: kolommen en indexen worden alleen toegevoegd als ze nog niet
-- bestaan. De app blijft werken vóór deze migratie (client-side filtering valt
-- terug op "alles tonen"; delete valt terug op hard delete).
begin;

alter table public.transactions
  add column if not exists deleted_at timestamptz;
alter table public.tasks
  add column if not exists deleted_at timestamptz;
alter table public.events
  add column if not exists deleted_at timestamptz;
alter table public.notes
  add column if not exists deleted_at timestamptz;

-- Partiële indexen: snelle filtering op de actieve (niet-verwijderde) rijen.
create index if not exists transactions_actief_idx
  on public.transactions (user_id)
  where deleted_at is null;
create index if not exists tasks_actief_idx
  on public.tasks (user_id)
  where deleted_at is null;
create index if not exists events_actief_idx
  on public.events (user_id)
  where deleted_at is null;
create index if not exists notes_actief_idx
  on public.notes (user_id)
  where deleted_at is null;

commit;
