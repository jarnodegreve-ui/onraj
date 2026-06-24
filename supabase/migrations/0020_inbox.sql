-- Slimme inbox: snelle captures (via Telegram: spraak/foto/tekst) krijgen een
-- inbox-vlag, zodat ze in één scherm te triëren zijn. inbox = true → wacht op
-- triage; false → verwerkt of gewoon in de app aangemaakt.
-- Idempotent; de app blijft werken vóór deze migratie (de Telegram-inserts
-- vallen terug op zonder inbox-vlag via isMissingColumn).
begin;

alter table public.tasks
  add column if not exists inbox boolean not null default false;
alter table public.notes
  add column if not exists inbox boolean not null default false;

create index if not exists tasks_inbox_idx
  on public.tasks (user_id) where inbox;
create index if not exists notes_inbox_idx
  on public.notes (user_id) where inbox;

commit;
