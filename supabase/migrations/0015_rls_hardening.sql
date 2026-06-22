-- ONRAJ — migratie 0015
-- Hardening van bestaande RLS-policies. De policies op push_subscriptions (0008),
-- account_balances (0012) en app_settings (0013) waren niet gebonden aan een rol
-- en vielen technisch terug op 'public' (incl. anon). Er lekte niets (de
-- voorwaarde auth.uid() = user_id matcht voor anon nooit), maar we maken het nu
-- expliciet 'authenticated' — consistent met de andere tabellen — en ontzeggen
-- de anon-rol elke toegang tot de gevoelige tabellen (extra grendel).
-- Idempotent: drop policy if exists + create.

begin;

-- ── push_subscriptions ──────────────────────────────────────────────────────
drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own" on public.push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own" on public.push_subscriptions
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);

-- ── account_balances ────────────────────────────────────────────────────────
drop policy if exists "ab_select_own" on public.account_balances;
create policy "ab_select_own" on public.account_balances
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "ab_insert_own" on public.account_balances;
create policy "ab_insert_own" on public.account_balances
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "ab_update_own" on public.account_balances;
create policy "ab_update_own" on public.account_balances
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ab_delete_own" on public.account_balances;
create policy "ab_delete_own" on public.account_balances
  for delete to authenticated using (auth.uid() = user_id);

-- ── app_settings (bevat de finance-pincode-hash) ────────────────────────────
drop policy if exists "settings_select_own" on public.app_settings;
create policy "settings_select_own" on public.app_settings
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.app_settings;
create policy "settings_insert_own" on public.app_settings
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.app_settings;
create policy "settings_update_own" on public.app_settings
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Extra grendel: anon-rol krijgt geen enkele toegang tot gevoelige tabellen ─
revoke all on public.app_settings from anon;
revoke all on public.account_balances from anon;
revoke all on public.transactions from anon;
revoke all on public.push_subscriptions from anon;

commit;
