-- ONRAJ — migratie 0017
-- Bijlagen (foto's/bestanden) ook bij taken: breid de entity_type-check uit met
-- 'task'. De Storage-bucket + policies (per user_id-map, migratie 0005) gelden al
-- voor elk entiteitstype, dus die blijven ongewijzigd.

begin;

alter table public.attachments
  drop constraint if exists attachments_entity_type_check;

alter table public.attachments
  add constraint attachments_entity_type_check
  check (entity_type in ('note', 'transaction', 'task'));

commit;
