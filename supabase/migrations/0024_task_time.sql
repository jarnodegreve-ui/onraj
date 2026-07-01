-- ONRAJ — migratie 0024
-- Optioneel tijdstip bij een taak + dedup-vlag voor tijd-reminders (Telegram).
-- Een taak met due_on (datum) + due_time ('HH:mm', Brusselse lokale tijd) krijgt
-- op dat tijdstip een Telegram-ping; reminded_on voorkomt dubbele meldingen.

begin;

alter table public.tasks
  add column if not exists due_time text
    check (due_time is null or due_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  add column if not exists reminded_on date;

commit;
