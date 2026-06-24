-- Vaste posten kunnen nu een einddatum hebben: end_month = laatste maand
-- ('YYYY-MM') dat de post nog terugkeert. NULL = blijft doorlopen.
-- Idempotent; de app blijft werken vóór deze migratie (end_month wordt dan
-- genegeerd via een isMissingColumn-terugval in de acties).
begin;

alter table public.recurring_transactions
  add column if not exists end_month text;

commit;
