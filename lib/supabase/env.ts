// Centrale plek voor de Supabase-omgevingsvariabelen. Zolang het Supabase-
// project nog niet gekoppeld is, draait de app in "preview"-modus: de shell
// rendert wel, maar auth en data zijn uitgeschakeld (zie supabaseConfigured).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True zodra zowel de URL als de anon-key gezet zijn in .env.local. */
export const supabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
