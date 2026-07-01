-- ONRAJ — migratie 0025 · Terugkerende transacties race-vrij
-- Twee gelijktijdige page-loads konden dezelfde maand dubbel materialiseren
-- (lezen → inserten → pas daarna het merkveld bijwerken is niet atomair).
-- Oplossing: transactions verwijst naar het sjabloon (recurring_id) en krijgt
-- een unieke sleutel per (sjabloon, datum); de app insert voortaan met
-- "on conflict do nothing". Handmatige transacties (recurring_id null) blijven
-- onbeperkt — Postgres beschouwt NULLs in een unique index als verschillend.
begin;

alter table public.transactions
  add column if not exists recurring_id uuid
    references public.recurring_transactions(id) on delete set null;

create unique index if not exists transactions_recurring_unique
  on public.transactions (recurring_id, occurred_on);

commit;
