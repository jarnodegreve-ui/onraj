-- ONRAJ — migratie 0006
-- Google Calendar-koppeling: OAuth-tokens per gebruiker. RLS zorgt dat enkel
-- de eigenaar (en server-acties namens hem) erbij kan.

begin;

create table if not exists public.google_tokens (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expiry timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists google_tokens_set_updated_at on public.google_tokens;
create trigger google_tokens_set_updated_at
  before update on public.google_tokens
  for each row execute function public.set_updated_at();

alter table public.google_tokens enable row level security;

drop policy if exists "google_tokens_eigenaar" on public.google_tokens;
create policy "google_tokens_eigenaar"
  on public.google_tokens
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
