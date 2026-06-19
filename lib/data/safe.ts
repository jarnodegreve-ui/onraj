/**
 * True wanneer een Supabase-fout betekent dat de tabel nog niet bestaat
 * (Postgres-code 42P01). Zo blijven nieuwe modules werken — als lege lijst —
 * tot de bijbehorende migratie gedraaid is.
 */
export function isMissingTable(error: { code?: string } | null): boolean {
  // 42P01 = Postgres undefined_table; PGRST205 = PostgREST "table niet in
  // schema-cache" (dit geeft supabase-js terug voor een ontbrekende tabel).
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/**
 * True wanneer een kolom nog niet bestaat — Postgres 42703 of de PostgREST
 * schema-cache-fout PGRST204. Zo blijven schrijfacties werken tot de migratie
 * die de kolom toevoegt gedraaid is.
 */
export function isMissingColumn(error: { code?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}
