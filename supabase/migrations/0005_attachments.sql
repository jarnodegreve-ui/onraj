-- ONRAJ — migratie 0005
-- Bijlagen (foto's/bestanden) bij notities en transacties: een metadata-tabel
-- plus een privé Storage-bucket met RLS per eigen map.

begin;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('note', 'transaction')),
  entity_id uuid not null,
  path text not null,
  name text not null,
  mime text,
  size integer,
  created_at timestamptz not null default now()
);

create index if not exists attachments_entity_idx
  on public.attachments (user_id, entity_type, entity_id);

alter table public.attachments enable row level security;

drop policy if exists "attachments_eigenaar" on public.attachments;
create policy "attachments_eigenaar"
  on public.attachments
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Privé Storage-bucket.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Storage-policies: je mag enkel in je eigen map (eerste pad-segment = user-id).
drop policy if exists "attachments_obj_select" on storage.objects;
create policy "attachments_obj_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "attachments_obj_insert" on storage.objects;
create policy "attachments_obj_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "attachments_obj_delete" on storage.objects;
create policy "attachments_obj_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
