import { isMissingTable } from "@/lib/data/safe";
import { toCategory } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Category, CategoryScope } from "@/lib/types";

/**
 * Beheerbare categorieën, op volgorde (position). Optioneel gefilterd op scope
 * ('task' of 'note'). Lege lijst tot migratie 0014 gedraaid is, zodat de
 * modules blijven werken (categorieën worden dan uit de items zelf afgeleid).
 */
export async function listCategories(
  scope?: CategoryScope,
): Promise<Category[]> {
  const supabase = await createClient();
  let query = supabase
    .from("categories")
    .select("*")
    .order("scope", { ascending: true })
    .order("position", { ascending: true });
  if (scope) query = query.eq("scope", scope);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toCategory);
}
