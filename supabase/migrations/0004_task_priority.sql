-- ONRAJ — migratie 0004
-- Prioriteit op taken (laag/middel/hoog) voor sorteren op dringendheid.

begin;

alter table public.tasks
  add column if not exists priority text not null default 'middel'
    check (priority in ('laag', 'middel', 'hoog'));

commit;
