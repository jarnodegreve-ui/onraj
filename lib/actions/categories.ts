"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isMissingTable } from "@/lib/data/safe";
import { createClient } from "@/lib/supabase/server";
import type { CategoryScope } from "@/lib/types";
import type { ActionResult } from "./result";

const scopeSchema = z.enum(["task", "note"]);
const nameSchema = z.string().trim().min(1, "Geef een naam.").max(60);
const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Ongeldige kleur.")
  .nullable()
  .optional();

// Welke itemtabel hoort bij een categorie-scope (voor cascade bij hernoemen/
// verwijderen).
const TABLE: Record<CategoryScope, "tasks" | "notes"> = {
  task: "tasks",
  note: "notes",
};

function pathsFor(scope: CategoryScope): string[] {
  return [
    "/instellingen",
    scope === "task" ? "/taken" : "/notities",
    "/dashboard",
    "/statistieken",
  ];
}

function revalidate(scope: CategoryScope) {
  pathsFor(scope).forEach((path) => revalidatePath(path));
}

const MIGRATIE_HINT = "Draai eerst migratie 0014 om categorieën te beheren.";

/** Namen van de beheerde taak-categorieën (voor snelkeuze in dialogen). */
export async function listTaskCategoryNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .eq("scope", "task")
    .order("position", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => row.name as string);
}

export async function createCategory(input: {
  scope: CategoryScope;
  name: string;
  color?: string | null;
}): Promise<ActionResult> {
  const parsed = z
    .object({ scope: scopeSchema, name: nameSchema, color: colorSchema })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }
  const { scope, name, color } = parsed.data;

  const supabase = await createClient();

  // Volgende positie = achteraan in de lijst.
  const { data: last } = await supabase
    .from("categories")
    .select("position")
    .eq("scope", scope)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? -1) + 1;

  const { error } = await supabase
    .from("categories")
    .insert({ scope, name, color: color ?? null, position });
  if (error) {
    if (isMissingTable(error)) return { ok: false, error: MIGRATIE_HINT };
    if (error.code === "23505") {
      return { ok: false, error: "Die categorie bestaat al." };
    }
    return { ok: false, error: error.message };
  }

  revalidate(scope);
  return { ok: true };
}

export async function updateCategory(
  id: string,
  input: { name: string; color?: string | null },
): Promise<ActionResult> {
  const parsed = z
    .object({ name: nameSchema, color: colorSchema })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }
  const { name, color } = parsed.data;

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("scope, name")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    if (isMissingTable(fetchError)) return { ok: false, error: MIGRATIE_HINT };
    return { ok: false, error: fetchError.message };
  }
  if (!existing) return { ok: false, error: "Categorie niet gevonden." };
  const scope = existing.scope as CategoryScope;

  const { error } = await supabase
    .from("categories")
    .update({ name, color: color ?? null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Er bestaat al een categorie met die naam." };
    }
    return { ok: false, error: error.message };
  }

  // Naam gewijzigd → meeschuiven in alle items met de oude naam.
  if (existing.name !== name) {
    const { error: cascadeError } = await supabase
      .from(TABLE[scope])
      .update({ category: name })
      .eq("category", existing.name);
    if (cascadeError) return { ok: false, error: cascadeError.message };
  }

  revalidate(scope);
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("scope, name")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) {
    if (isMissingTable(fetchError)) return { ok: false, error: MIGRATIE_HINT };
    return { ok: false, error: fetchError.message };
  }
  if (!existing) return { ok: false, error: "Categorie niet gevonden." };
  const scope = existing.scope as CategoryScope;

  // Items met deze categorie worden categorieloos (niet verwijderd).
  const { error: clearError } = await supabase
    .from(TABLE[scope])
    .update({ category: null })
    .eq("category", existing.name);
  if (clearError) return { ok: false, error: clearError.message };

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate(scope);
  return { ok: true };
}

export async function reorderCategories(
  scope: CategoryScope,
  ids: string[],
): Promise<ActionResult> {
  const parsed = z
    .array(z.string().min(1).max(64))
    .max(500)
    .safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Ongeldige volgorde." };

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map((id, index) =>
      supabase.from("categories").update({ position: index }).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error)?.error;
  if (failed) {
    if (isMissingTable(failed)) return { ok: false, error: MIGRATIE_HINT };
    return { ok: false, error: failed.message };
  }

  revalidate(scope);
  return { ok: true };
}
