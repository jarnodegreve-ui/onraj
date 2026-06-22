import type { Category } from "./types";

/**
 * Categorieën in gebruik, gesorteerd op de beheerde volgorde (position),
 * daarna alfabetisch voor categorieën die (nog) niet beheerd zijn.
 */
export function orderByManaged(inUse: string[], managed: Category[]): string[] {
  const pos = new Map(managed.map((category, index) => [category.name, index]));
  const rank = (name: string) => pos.get(name) ?? Number.MAX_SAFE_INTEGER;
  return [...inUse].sort((a, b) => {
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.localeCompare(b, "nl");
  });
}

/**
 * Suggesties voor de editor: alle beheerde categorieën eerst (ook ongebruikte),
 * daarna losse categorieën die nog niet beheerd zijn.
 */
export function suggestionList(inUse: string[], managed: Category[]): string[] {
  const names = managed.map((category) => category.name);
  const managedSet = new Set(names);
  const extra = inUse
    .filter((name) => !managedSet.has(name))
    .sort((a, b) => a.localeCompare(b, "nl"));
  return [...names, ...extra];
}
