-- Subtaken / checklist binnen een taak: een lichte jsonb-lijst van afvinkbare
-- deelstappen, elk {id, title, done}. Reist mee met de taak — geen aparte
-- tabel, geen joins. Idempotent; de app blijft werken vóór deze migratie (de
-- mapper valt terug op een lege lijst, schrijfacties op isMissingColumn).
begin;

alter table public.tasks
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

commit;
