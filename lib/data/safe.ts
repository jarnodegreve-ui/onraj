/**
 * True wanneer een Supabase-fout betekent dat de tabel nog niet bestaat
 * (Postgres-code 42P01). Zo blijven nieuwe modules werken — als lege lijst —
 * tot de bijbehorende migratie gedraaid is.
 */
export function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}
